var scene;
var renderer;
var effect;
var camera;
var virtCamera;
var mesh;
var geom;
var material;
var controls;

//Scene Manipulator variables
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;

var time;

//-------------------------------------------------------
// Sets up the scene
//-------------------------------------------------------
var init = function(){
  //Setup our THREE scene--------------------------------
  time = Date.now();
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
  virtCamera = new THREE.PerspectiveCamera(60,1,0.1,1);
  virtCamera.position.z = 0.1;
  cameraOffset = new THREE.Vector3();
  controls = new THREE.VRControls(virtCamera);
  //Setup our material----------------------------------
  material = new THREE.ShaderMaterial({
    uniforms:{

      screenResolution:{type:"v2", value:new THREE.Vector2(window.innerWidth, window.innerHeight)},
      cameraPos:{type:"v3", value:virtCamera.position},
      cameraQuat:{type:"v4", value:virtCamera.quaternion},
      fov:{type:"f", value:virtCamera.fov},
      halfCubeWidthHyp:{type:"f", value: hCWH},
      halfCubeWidthKlein:{type:"f", value: hCWK}
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
  controls.update();
  //mesh.material.uniforms.halfCubeWidthHyp = hCWH;
  //mesh.material.uniforms.halfCubeWidthKlein = hCWK;
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
var onResize = function(){
  effect.setSize(window.innerWidth, window.innerHeight);
  if(material != null){
    material.uniforms.screenResolution.value.x = window.innerWidth;
    material.uniforms.screenResolution.value.y = window.innerHeight;
  }
}
window.addEventListener('resize', onResize, false);
