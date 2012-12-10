@none: #eeeeee;
@low: #77b0d3;
@moderate: #b6e3ef;
@high: #FEE090;
@veryhigh: #FC8D59;
@extreme: #D73027;

Map {
  //background-color:#000000;  
}

#fire-forecast {
  line-color:#594;
  line-width:0;
  polygon-opacity:0;

    [GRID_CODE = 1] { polygon-opacity: .6;  polygon-fill: @low; line-color: @low; polygon-opacity: .7 }
    [GRID_CODE = 2] { polygon-opacity: .6;  polygon-fill: @moderate; line-color: @moderate; polygon-opacity: .7 }
    [GRID_CODE = 3] { polygon-opacity: .6;  polygon-fill: @high; line-color: @high; polygon-opacity: .7 }
    [GRID_CODE = 4] { polygon-opacity: .6;  polygon-fill: @veryhigh; line-color: @veryhigh; polygon-opacity: .7 }
    [GRID_CODE = 5] { polygon-opacity: .6;  polygon-fill: @extreme; line-color: @extreme; polygon-opacity: .7 }
}

#incidents {point-file: url(maki/triangle-1.png);}

#incidents [zoom = 3] {point-file: url(maki/triangle-7.png); }
#incidents [zoom = 4] {point-file: url(maki/triangle-9.png); }
#incidents [zoom >= 5] {point-file: url(maki/triangle-10.png); }
#incidents [zoom >= 6] {point-file: url(maki/triangle-12.png); }

#10madmin1statesprovi {
  line-color:#594;
  line-width:0.5;
  polygon-opacity:1;
  polygon-fill:#ae8;
}
