var changeScene = function(index){
  material.uniforms.sceneIndex.value = index;
}

var onKey = function(event){
  var didChange = false;
  switch(event.keyCode){
    case 49:// 1 - 5 around one edge
      hCWH = 0.5306375310;
      hCWK = 0.4858682718;
      didChange = true;
      break;
    case 50:// 2 - 6 around one edge
      hCWH = 0.6584789485;  // half cube width in hyperbolic distance
      hCWK = 0.5773502692;  // half cube width in Klein model
      didChange = true;
      break;
    case 51:// 3 - 7 around one edge
      hCWH = 0.7245373613;
      hCWK = 0.6197119841;
      didChange = true;
      break;
    case 52:// 4 - 8 around one edge
      hCWH = 0.7642854597;
      hCWK = 0.6435942529;
      didChange = true;
      break;
    case 53:// 5 - 9 around one edge
      hCWH = 0.7903490689;
      hCWK = 0.6586067372;
      didChange = true;
      break;
    case 54:// 6 - 10 around one edge
      hCWH = 0.8084608338;
      hCWK = 0.6687403050;
      didChange = true;
      break;
    case 55:// 7 - 11 around one edge
      hCWH = 0.8215961187;
      hCWK = 0.6759376756;
      didChange = true;
      break;
    case 56:// 8 - 12 around one edge
      hCWH = 0.8314429455;
      hCWK = 0.6812500386;
      didChange = true;
      break;
    default:
      break;
  }

  if(didChange){
    gens = createGenerators();
    material.uniforms.generators.value = gens;
    material.uniforms.invGenerators.value = invGenerators(gens);
    material.uniforms.halfCubeWidthKlein.value = hCWK;
  }
}
window.addEventListener("keydown", onKey, true);
