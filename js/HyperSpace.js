var camera;
var scene;
var renderer;
var mesh;
var cube;

var init = function(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(80, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.x = 0;
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  var geometry = new THREE.BoxGeometry(1,1,1);
  var material = new THREE.MeshBasicMaterial({color:0x00ffff});
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
}

var animate = function(){
  requestAnimationFrame(animate);

  cube.rotation.x += 0.1;
  cube.rotation.y += 0.1;

  renderer.render(scene, camera);
}
init();
animate();
