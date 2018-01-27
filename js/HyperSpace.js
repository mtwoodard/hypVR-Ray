var scene;
var renderer;
var camera;
var mesh;
var geom;
var material;

//-------------------------------------------------------
// Sets up the scene with objects
//-------------------------------------------------------
var init = function(){
  //Setup our THREE scene--------------------------------
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
  //Setup our material----------------------------------
  material = new THREE.ShaderMaterial({
    uniforms:{
      screenResolution:{type:"v2", value:new THREE.Vector2(window.innerWidth, window.innerHeight)}
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: document.getElementById('fragmentShader').textContent,
    transparent:true
  });
  //Setup a "quad" to render on-------------------------
  geom = new THREE.BufferGeometry();
  var vertices = new Float32Array([
    -1.0, -1.0, 0.0,
     1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,

    -1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,
    -1.0,  1.0, 0.0
  ]);
  geom.addAttribute('position',new THREE.BufferAttribute(vertices,3));
  mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);
}

//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
  renderer.render(scene, camera);
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
var onResize = function(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  if(material != null){
    material.uniforms.screenResolution.value.x = window.innerWidth;
    material.uniforms.screenResolution.value.y = window.innerHeight;
  }
}
window.addEventListener('resize', onResize, false);
