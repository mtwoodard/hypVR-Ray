var changeScene = function(index){
  material.uniforms.sceneIndex.value = index;
}

var onKey = function(event){
  var didChange = true;
  switch(event.keyCode){
    case 49:// 1 - 5 around one edge
      hCWH = 0.5306375310;
      hCWK = 0.4858682718;
      sphereRad = 1.0; //need to be changed for each case
      horosphereSize = 2.6;
      break;
    case 50:// 2 - 6 around one edge
      hCWH = 0.6584789485;  // half cube width in hyperbolic distance
      hCWK = 0.5773502692;  // half cube width in Klein model
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    case 51:// 3 - 7 around one edge
      hCWH = 0.7245373613;
      hCWK = 0.6197119841;
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    case 52:// 4 - 8 around one edge
      hCWH = 0.7642854597;
      hCWK = 0.6435942529;
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    case 53:// 5 - 9 around one edge
      hCWH = 0.7903490689;
      hCWK = 0.6586067372;
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    case 54:// 6 - 10 around one edge
      hCWH = 0.8084608338;
      hCWK = 0.6687403050;
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    case 55:// 7 - 11 around one edge
      hCWH = 0.8215961187;
      hCWK = 0.6759376756;
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    case 56:// 8 - 12 around one edge
      hCWH = 0.8314429455;
      hCWK = 0.6812500386;
      sphereRad = 1.0;
      horosphereSize = 2.6;
      break;
    default:
      didChange = false;
      break;
  }

  if(didChange){
    gens = createGenerators();
    invGens = invGenerators(gens);
    material.uniforms.generators.value = gens;
    material.uniforms.invGenerators.value = invGens;
    material.uniforms.halfCubeWidthKlein.value = hCWK;
  }
}
window.addEventListener("keydown", onKey, true);
