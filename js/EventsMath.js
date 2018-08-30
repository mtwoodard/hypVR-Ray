//----------------------------------------------------------------------
//	Math Extensions
//----------------------------------------------------------------------
Math.clamp = function(input, min, max){
	return Math.max(Math.min(input, max), min);
}

//Takes average of a float array
Math.average = function(arr){
	var ave = 0.0;
	for(var i = 0; i < arr.length; i++) {
		ave += arr[i];
	}
	ave /= arr.length;
	return ave;
}

//----------------------------------------------------------------------
//	Dot Product
//----------------------------------------------------------------------
THREE.Vector4.prototype.lorentzDot = function(v){
	return this.x * v.x + this.y * v.y + this.z * v.z - this.w * v.w;
}

//----------------------------------------------------------------------
//	Norm & Normalize
//----------------------------------------------------------------------
THREE.Vector4.prototype.geometryLength = function(){
	return Math.sqrt(Math.abs(this.lorentzDot(this)));
}

THREE.Vector4.prototype.geometryNormalize = function(){
	return this.divideScalar(this.geometryLength());
}

//----------------------------------------------------------------------
//	Matrix Operations
//----------------------------------------------------------------------
THREE.Matrix4.prototype.add = function (m) {
  	this.set.apply(this, [].map.call(this.elements, function (c, i) { return c + m.elements[i] }));
};

THREE.Matrix4.prototype.gramSchmidt = function(){
	var m = this.transpose(); 
	var n = m.elements; //elements are stored in column major order we need row major
	var temp = new THREE.Vector4();
	var temp2 = new THREE.Vector4();
	for (var i = 0; i<4; i++) {  ///normalize row
		var invRowNorm = 1.0 / temp.fromArray(n.slice(4*i, 4*i+4)).geometryLength();
		for (var l = 0; l<4; l++) {
			n[4*i + l] = n[4*i + l] * invRowNorm;
		}
		for (var j = i+1; j<4; j++) { // subtract component of ith vector from later vectors
			var component = temp.fromArray(n.slice(4*i, 4*i+4)).lorentzDot(temp2.fromArray(n.slice(4*j, 4*j+4)));
			for (var l = 0; l<4; l++) {
				n[4*j + l] -= component * n[4*i + l];
			}
		}
	}
	m.elements = n;
	this.elements = m.transpose().elements;
}

//----------------------------------------------------------------------
//	Vector - Generators
//----------------------------------------------------------------------
function getFwdVector() {
	return new THREE.Vector3(0,0,-1);
}
function getRightVector() {
	return new THREE.Vector3(1,0,0);
}
function getUpVector() {
	return new THREE.Vector3(0,1,0);
}

// Constructs a point on the hyperboloid from a direction and a hyperbolic distance.
function constructHyperboloidPoint(direction, distance){
	var w = Math.cosh(distance);
	var magSquared = w * w - 1;
	direction.normalize();
	direction.multiplyScalar(Math.sqrt(magSquared));
	return new THREE.Vector4(direction.x, direction.y, direction.z, w);
}

//----------------------------------------------------------------------
//	Matrix - Generators
//----------------------------------------------------------------------
function translateByVector(v) { // trickery stolen from Jeff Weeks' Curved Spaces app
  	var dx = v.x; var dy = v.y; var dz = v.z;
	var len = Math.sqrt(dx*dx + dy*dy + dz*dz);

	var m03 = dx; var m13 = dy; var m23 = dz;
	var c1 = Math.sinh(len);
	var c2 = Math.cosh(len) - 1;
	m03 /= len; m13 /= len; m23 /= len; 

  	if (len == 0) return new THREE.Matrix4().identity();
  	else{
      dx /= len;
      dy /= len;
      dz /= len;
      var m = new THREE.Matrix4().set(
        0, 0, 0, m03,
        0, 0, 0, m13,
        0, 0, 0, m23,
        dx,dy,dz, 0.0);
      var m2 = new THREE.Matrix4().copy(m).multiply(m);
      m.multiplyScalar(c1);
      m2.multiplyScalar(c2);
      var result = new THREE.Matrix4().identity();
      result.add(m);
      result.add(m2);
      return result;
    }
}

//-----------------------------------------------------------------------------------------------------------------------------
//	Helper Functions
//-----------------------------------------------------------------------------------------------------------------------------

function fakeDist( v ){  //good enough for comparison of distances on the hyperboloid
	return v.x*v.x + v.y*v.y + v.z*v.z;
}

////////check if we are still inside the central fund dom...
function fixOutsideCentralCell( mat ) { 
	//assume first in Gens is identity, should probably fix when we get a proper list of matrices
	var cPos = new THREE.Vector4(0,0,0,1).applyMatrix4( mat ); //central
	var bestDist = fakeDist(cPos);
	var bestIndex = -1;
	for (var i=0; i < gens.length; i++){
		pos = new THREE.Vector4(0,0,0,1).applyMatrix4( gens[i] ).applyMatrix4( mat );
		if (fakeDist(pos) < bestDist) {
			bestDist = fakeDist(pos);
			bestIndex = i;
		}
	}
	if (bestIndex != -1){
		mat = mat.multiply(gens[bestIndex]);
    	return bestIndex;
	}
    else
		return -1;
}

//-----------------------------------------------------------------------------------------------------------------------------
//	Object Constructors
//-----------------------------------------------------------------------------------------------------------------------------

var PointLightObject = function(pos, colorInt){ //position is a euclidean Vector3
	var posMag = pos.length();
	var posDir = pos.normalize();
	lightPositions.push(constructHyperboloidPoint(posDir, posMag));
	lightIntensities.push(colorInt);
}

//--------------------------------------------------------------------
// Handle window resize
//--------------------------------------------------------------------
var onResize = function(){
	g_effect.setSize(window.innerWidth, window.innerHeight);
	if(g_material != null){
		g_material.uniforms.screenResolution.value.x = window.innerWidth;
		g_material.uniforms.screenResolution.value.y = window.innerHeight;
	}
}
window.addEventListener('resize', onResize, false);

//EVENTS**************************************************************

//--------------------------------------------------------------------
// Listens for double click to enter fullscreen VR mode
//--------------------------------------------------------------------
document.body.addEventListener('click', function(event){
if(event.target.id === "vr-icon"){
	event.target.style.display = "none";
	g_effect.phoneVR.setVRMode(!renderer.phoneVR.isVRMode);
}
if(g_effect.phoneVR.orientationIsAvailable()){
	g_effect.setFullScreen(true);
	if(typeof window.screen.orientation !== 'undefined' && typeof window.screen.orientation.lock === 'function')
		window.screen.orientation.lock('landscape-primary');
}
});

//--------------------------------------------------------------------
// Listen for keys for movement/rotation
//--------------------------------------------------------------------
function key(event, sign){
var control = g_controls.manualControls[event.keyCode];
if(control == undefined || sign === 1 && control.active || sign == -1 && !control.active) return;

control.active = (sign === 1);
if (control.index <= 2)
	g_controls.manualRotateRate[control.index] += sign * control.sign;
else if (control.index <= 5)
	g_controls.manualMoveRate[control.index - 3] += sign * control.sign;
}

document.addEventListener('keydown', function(event){key(event, 1);}, false);
document.addEventListener('keyup', function(event){key(event, -1);}, false);

//--------------------------------------------------------------------
// Phone screen tap for movement
//--------------------------------------------------------------------
function tap(event, sign){
	g_controls.manualMoveRate[0] += sign;
}

document.addEventListener('touchstart', function(event){tap(event, 1);}, false);
document.addEventListener('touchend', function(event){tap(event, -1);}, false);
