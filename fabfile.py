#!/usr/bin/env python

import datetime
from glob import glob
import os

from fabric.api import *

import app
import app_config

app.config['PROPAGATE_EXCEPTIONS'] = True

logger = logging.getLogger('tumblr')
file_handler = logging.FileHandler('/var/log/wildfires.log')
formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)
logger.setLevel(logging.INFO)

"""
Base configuration
"""
env.project_name = app_config.PROJECT_NAME
env.deployed_name = app_config.DEPLOYED_NAME
env.deploy_to_servers = True
env.repo_url = 'git@github.com:nprapps/%(project_name)s.git' % env
env.alt_repo_url = None
env.user = 'ubuntu'
env.python = 'python2.7'
env.path = '/home/%(user)s/apps/%(project_name)s' % env
env.repo_path = '%(path)s/repository' % env
env.virtualenv_path = '%(path)s/virtualenv' % env
env.tilemill_projects = os.path.expanduser('~/Documents/MapBox/project')
env.forward_agent = True

"""
Environments
"""
def production():
    env.settings = 'production'
    env.s3_buckets = app_config.PRODUCTION_S3_BUCKETS
    env.hosts = app_config.PRODUCTION_SERVERS

def staging():
    env.settings = 'staging'
    env.s3_buckets = app_config.STAGING_S3_BUCKETS
    env.hosts = app_config.STAGING_SERVERS

"""
Branches
"""
def stable():
    """
    Work on stable branch.
    """
    env.branch = 'stable'

def master():
    """
    Work on development branch.
    """
    env.branch = 'master'

def branch(branch_name):
    """
    Work on any specified branch.
    """
    env.branch = branch_name

def _confirm_branch():
    """
    Confirm a production deployment.
    """
    if (env.settings == 'production' and env.branch != 'stable'):
        answer = prompt("You are trying to deploy the '%(branch)s' branch to production.\nYou should really only deploy a stable branch.\nDo you know what you're doing?" % env, default="Not at all")
        if answer not in ('y','Y','yes','Yes','buzz off','screw you'):
            exit()

"""
Template-specific functions
"""
def less():
    """
    Render LESS files to CSS.
    """
    for path in glob('less/*.less'):
        filename = os.path.split(path)[-1]
        name = os.path.splitext(filename)[0]
        out_path = 'www/css/%s.css' % name

        local('node_modules/.bin/lessc %s %s' % (path, out_path))

def jst():
    """
    Render Underscore templates to a JST package.
    """
    local('node_modules/.bin/jst --template underscore jst www/js/templates.js')

def render():
    """
    Render HTML templates and compile assets.
    """
    from flask import g

    less()
    jst()

    compiled_includes = []

    for rule in app.app.url_map.iter_rules():
        rule_string = rule.rule
        name = rule.endpoint

        if name == 'static':
            print 'Skipping %s' % name
            continue

        if name.startswith('_'):
            print 'Skipping %s' % name
            continue

        if rule_string.endswith('/'):
            filename = 'www' + rule_string + 'index.html'
        elif rule_string.endswith('.html'):
            filename = 'www' + rule_string
        else:
            print 'Skipping %s' % name
            continue

        print 'Rendering %s' % (filename)

        with app.app.test_request_context(path=rule_string):
            g.compile_includes = True
            g.compiled_includes = compiled_includes

            view = app.__dict__[name]
            content = view()

            compiled_includes = g.compiled_includes

        with open(filename, 'w') as f:
            f.write(content)

"""
Setup
"""
def setup():
    """
    Setup servers for deployment.
    """
    require('settings', provided_by=[production, staging])
    require('branch', provided_by=[stable, master, branch])

    setup_directories()
    setup_virtualenv()
    clone_repo()
    checkout_latest()
    install_requirements()

def setup_directories():
    """
    Create server directories.
    """
    require('settings', provided_by=[production, staging])

    run('mkdir -p %(path)s' % env)

def setup_virtualenv():
    """
    Setup a server virtualenv.
    """
    require('settings', provided_by=[production, staging])

    run('virtualenv -p %(python)s --no-site-packages %(virtualenv_path)s' % env)
    run('source %(virtualenv_path)s/bin/activate' % env)

def clone_repo():
    """
    Clone the source repository.
    """
    require('settings', provided_by=[production, staging])

    run('git clone %(repo_url)s %(repo_path)s' % env)

    if env.get('alt_repo_url', None):
        run('git remote add bitbucket %(alt_repo_url)s' % env)

def checkout_latest(remote='origin'):
    """
    Checkout the latest source.
    """
    require('settings', provided_by=[production, staging])

    env.remote = remote

    run('cd %(repo_path)s; git fetch %(remote)s' % env)
    run('cd %(repo_path)s; git checkout %(branch)s; git pull %(remote)s %(branch)s' % env)


def install_requirements():
    """
    Install the latest requirements.
    """
    require('settings', provided_by=[production, staging])

    run('%(virtualenv_path)s/bin/pip install -U -r %(repo_path)s/requirements.txt' % env)

def create_log_file():
    """
    Creates the log file for recording fire updates.
    """
    sudo('touch /var/log/wildfires.log')
    sudo('chown ubuntu /var/log/wildfires.log')

"""
Deployment
"""
def _deploy_to_s3():
    """
    Deploy the gzipped stuff to
    """
    render()

    s3cmd = 's3cmd -P --add-header=Cache-Control:max-age=5 --add-header=Content-encoding:gzip --guess-mime-type --recursive sync gzip/ %s'

    for bucket in env.s3_buckets:
        env.s3_bucket = bucket
        local(s3cmd % ('s3://%(s3_bucket)s/%(deployed_name)s/' % env))

def _gzip_www():
    """
    Gzips everything in www and puts it all in gzip
    """
    local('python gzip_www.py')

def deploy(remote='origin'):
    require('settings', provided_by=[production, staging])
    require('branch', provided_by=[stable, master, branch])

    _confirm_branch()
    _gzip_www()
    _deploy_to_s3()

    if env.get('deploy_to_servers', False):
        checkout_latest(remote)

"""
Application
"""
def update_config_from_tilemill():
    """
    Copy the latest configuration from TileMill to the local directory.
    """
    local('rm -rf tilemill/' % env)
    local('cp -R %(tilemill_projects)s/%(project_name)s/ tilemill/' % env)

def update_shapefiles():
    """
    Fetch the latest shapefiles and process them.
    """
    try:
        with lcd('data'):
            local('curl -O http://www.wfas.net/maps/data/fdc_f.zip')
            local('unzip -o -j fdc_f.zip')
            local('curl -O http://psgeodata.fs.fed.us/data/gis_data_download/dynamic/lg_incidents.zip')
            local('unzip -o -j lg_incidents.zip')
            local('ogr2ogr -overwrite -t_srs "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs" lg_incidents_reprojected.shp lg_incidents.shp')
            local('ogr2ogr -overwrite -s_srs EPSG:2163 -t_srs "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs" fdc_f_reprojected.shp fdc_f.shp')
    except Exception, e:
        logger.error('%s' % e)

def _rewrite_mml(data_root, mml_path):
    """
    Rewrite MML's with a given data path.
    """
    with open(mml_path, 'r') as f:
        content = f.read()

    with open(mml_path, 'w') as f:
        content = content.replace('/Users/bboyer/src/us-wildfires/data/', data_root)
        f.write(content)

def update_config_from_version_control():
    """
    Copy the latest configuration to TileMill from the local directory.
    """
    local('rm -rf %(tilemill_projects)s/%(project_name)s/' % env)
    local('cp -R tilemill/ %(tilemill_projects)s/%(project_name)s/' % env)

    _rewrite_mml(
        '%s/data/' % os.getcwd(),
        '%(tilemill_projects)s/%(project_name)s/project.mml' % env
    )

def local_render_map():
    """
    Render the map locally on OSX.
    """
    update_shapefiles()
    update_config_from_version_control()

    local('/Applications/TileMill.app/Contents/Resources/node /Applications/TileMill.app/Contents/Resources/index.js export --format=sync --bbox=-124.848974,24.396308,-66.885444,49.384358 --minzoom=3 --maxzoom=9 us-wildfires README.md')

def render_map():
    """
    Render the map remotely on the server.
    """
    run('cd %(repo_path)s; ../virtualenv/bin/fab server_render_map' % env)

def server_render_map():
    """
    Render the map locally on the server. Intended to be used as a cron.
    """
    update_shapefiles()

    try:
        env.tilemill_projects = '%(path)s/tilemill-temp' % env

        local('rm -rf %(tilemill_projects)s' % env)
        local('mkdir -p %(tilemill_projects)s/project/' % env)
        local('mkdir -p %(tilemill_projects)s/cache/' % env)
        local('cp -R %(repo_path)s/tilemill %(tilemill_projects)s/project/%(project_name)s' % env)

        _rewrite_mml(
            '%(repo_path)s/data/' % env,
            '%(tilemill_projects)s/project/%(project_name)s/project.mml' % env
        )

        local('/usr/share/tilemill/index.js export --format=sync --bbox=-124.848974,24.396308,-66.885444,49.384358 --minzoom=3 --maxzoom=9 --files=%(tilemill_projects)s --syncAccount=npr --syncAccessToken="$MAPBOX_SYNC_ACCESS_TOKEN_WILDFIRES" us-wildfires ./README.md' % env)

        logger.info('Ran successfully at %s' % datetime.datetime.now())

    except Exception, e:
        logger.error('%s' % e)

"""
Destruction
"""
def shiva_the_destroyer():
    """
    Deletes the app from s3
    """
    with settings(warn_only=True):

        for bucket in env.s3_buckets:
            local('s3cmd del --recursive s3://%s/%s' % (bucket, env.deployed_name))

        if env.get('alt_s3_bucket', None):
            local('s3cmd del --recursive s3://%s/%s' % (env.get('alt_s3_bucket', None), env.deployed_name))

        if env.get('deploy_to_servers', False):
            run('rm -rf %(path)s' % env)
