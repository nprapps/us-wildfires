#!/bin/sh
cd shp/
curl -O http://www.wfas.net/maps/data/fdc_f.zip
unzip -o -j fdc_f.zip

curl -O http://www.wfas.net/maps/data/fdc_o.zip
unzip -o -j fdc_o.zip

curl -O http://psgeodata.fs.fed.us/data/gis_data_download/dynamic/lg_incidents.zip
unzip -o lg_incidents.zip

cp reproject/cleanprojection.prj .

cd ..
cd reproject/

cp reproject/cleanprojection.prj reproject/reproject/fdc_f.prj

cd ..
cd shp/

rm -rf fdc_f.zip
rm -rf fdc_o.zip
rm -rf lg_incidents.zip
rm -rf lg_incidents.htm

ogr2ogr -s_srs EPSG:3857 /Users/mstiles/Desktop/records/GIS/fires/reproject/lg_incidents.shp lg_incidents.shp

ogr2ogr -s_srs EPSG:3857 /Users/mstiles/Desktop/records/GIS/fires/reproject/fdc_f.shp fdc_f.shp