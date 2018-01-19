var camera;
var scene;
var renderer;
var mesh;
var cube;

var effect;
var controls;

//-------------------------------------------------------
// Sets up the scene with objects
//-------------------------------------------------------
var init = function(){
  //Three scene stuff -----------------------------------------
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
  renderer = new THREE.WebGLRenderer({antialias: true});
  document.body.appendChild(renderer.domElement);
  //VR Stuff --------------------------------------------------
  controls = new THREE.VRControls(camera);
  effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  //make a cube we can see ------------------------------------
  var geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  //generate material from shaders in index.html --------------
  var material = new THREE.ShaderMaterial({
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent
  });
  cube = new THREE.Mesh(geometry, material);
  cube.position.z = -0.3;
  scene.add(cube);
}

//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
  controls.update();
  cube.rotation.x += 0.1;
  cube.rotation.y += 0.1;

  effect.render(scene, camera);
  requestAnimationFrame(animate);
}

//-------------------------------------------------------
// Where the magic happens
//-------------------------------------------------------
init();
animate();


//-------------------------------------------------------
// Event listeners
//-------------------------------------------------------

// Double click for full screen ------------------------------
document.body.addEventListener('dblclick', function(){
  effect.setFullScreen(true);
});
// On keydown for z, zero the device's positional sensor -----
var onKey = function(event){
  event.preventDefault();
  if(event.keyCode == 90){
    controls.zeroSensor();
  }
}
window.addEventListener("keydown", onKey, true);
// adjust projection matrix when resizing window -------------
var onWindowResize = function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();

  effect.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize, false);
