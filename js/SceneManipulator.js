var onKey = function(event){
  switch(event.keyCode){
    case 49:// 1 - 5 around one edge
      gens = createGenerators(0.5306375310);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.4858682718;
      break;
    case 50:// 2 - 6 around one edge
      gens = createGenerators(0.6584789485);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.5773502692;
      break;
    case 51:// 3 - 7 around one edge
      gens = createGenerators(0.7245373613);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.6197119841;
      break;
    case 52:// 4 - 8 around one edge
      gens = createGenerators(0.7642854597);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.6435942529;
      break;
    case 53:// 5 - 9 around one edge
      gens = createGenerators(0.7903490689);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.6586067372;
      break;
    case 54:// 6 - 10 around one edge
      gens = createGenerators(0.8084608338);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.6687403050;
      break;
    case 55:// 7 - 11 around one edge
      gens = createGenerators(0.8215961187);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.6759376756;
      break;
    case 56:// 8 - 12 around one edge
      gens = createGenerators(0.8314429455);
      material.uniforms.generators.value = gens;
      material.uniforms.invGenerators.value = invGenerators(gens);
      material.uniforms.halfCubeWidthKlein.value = 0.6812500386;
      break;
    default:
      break;
  }
}
window.addEventListener("keydown", onKey, true);
