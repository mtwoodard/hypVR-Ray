var gens;
var invGens;
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;
var sphereRad = 1.0;
var horosphereSize = 2.6;

var createGenerators = function(){
  var gen0 = translateByVector(new THREE.Vector3( 2.0*hCWH, 0.0, 0.0));
  var gen1 = translateByVector(new THREE.Vector3(-2.0*hCWH, 0.0, 0.0));
  var gen2 = translateByVector(new THREE.Vector3(0.0,  2.0*hCWH, 0.0));
  var gen3 = translateByVector(new THREE.Vector3(0.0, -2.0*hCWH, 0.0));
  var gen4 = translateByVector(new THREE.Vector3(0.0, 0.0,  2.0*hCWH));
  var gen5 = translateByVector(new THREE.Vector3(0.0, 0.0, -2.0*hCWH));
  return [gen0, gen1, gen2, gen3, gen4, gen5];
}

var invGenerators = function(genArr){
  return [genArr[1],genArr[0],genArr[3],genArr[2],genArr[5],genArr[4]];
}

//What we need to init our dat GUI
var initGui = function(){
  var guiInfo = { //Since dat gui can only modify object values we store variables here.
    edgeCase:2
  };
  var gui = new dat.GUI();
  gui.add(material.uniforms.sceneIndex, 'value',{Sphere_horosphere: 1, Sphere_plane: 2, Medial_surface: 3, Cube_planes: 4}).name("Scene");
  var edgeController = gui.add(guiInfo, 'edgeCase', {"1-5":1, "2-6":2, "3-7":3, "4-8":4, "5-9":5, "6-10":6, "7-11":7, "8-12":8}).name("Edge Case");
  edgeController.onFinishChange(function(value){
    //console.log(value);
    switch(value){
      case '1':// 1 - 5 around one edge
        hCWH = 0.5306375310;
        hCWK = 0.4858682718;
        sphereRad = 1.0; //need to be changed for each case
        horosphereSize = 2.6;
        break;
      case '2':// 2 - 6 around one edge
        hCWH = 0.6584789485;  // half cube width in hyperbolic distance
        hCWK = 0.5773502692;  // half cube width in Klein model
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      case '3':// 3 - 7 around one edge
        hCWH = 0.7245373613;
        hCWK = 0.6197119841;
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      case '4':// 4 - 8 around one edge
        hCWH = 0.7642854597;
        hCWK = 0.6435942529;
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      case '5':// 5 - 9 around one edge
        hCWH = 0.7903490689;
        hCWK = 0.6586067372;
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      case '6':// 6 - 10 around one edge
        hCWH = 0.8084608338;
        hCWK = 0.6687403050;
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      case '7':// 7 - 11 around one edge
        hCWH = 0.8215961187;
        hCWK = 0.6759376756;
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      case '8':// 8 - 12 around one edge
        hCWH = 0.8314429455;
        hCWK = 0.6812500386;
        sphereRad = 1.0;
        horosphereSize = 2.6;
        break;
      default:
        break;
      }
      gens = createGenerators();
      invGens = invGenerators(gens);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGens;
      material.uniforms.halfCubeWidthKlein.value = hCWK;
      material.uniforms.sphereRad.value = sphereRad;
      material.uniforms.horosphereSize.value = horosphereSize;
  });
}
