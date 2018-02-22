var onKey = function(event){
  switch(event.keyCode){
    case 49://1
      hCWH = 0.5306375310;
      hCWK = 0.4858682718;
      break;
    case 50://2
      hCWH = 0.6584789485;
      hCWK = 0.5773502692;
      break;
    case 51://3
      hCWH = 0.7245373613;
      hCWK = 0.6197119841;
      break;
    case 52://4
      hCWH = 0.7642854597;
      hCWK = 0.6435942529;
      break;
    case 53://5
      hCWH = 0.7903490689;
      hCWK = 0.6586067372;
      break;
    case 54://6
      hCWH = 0.8084608338;
      hCWK = 0.6687403050;
      break;
    case 55://7
      hCWH = 0.8215961187;
      hCWK = 0.6759376756;
      break;
    case 56://8
      hCWH = 0.8314429455;
      hCWK = 0.6812500386;
      break;
    default:
      break;
  }
  console.log(hCWH);

}
window.addEventListener("keydown", onKey, true);
