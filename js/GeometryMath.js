//----------------------------------------------------------------------
//	Math Extensions
//----------------------------------------------------------------------
Math.clamp = function(input, min, max){
	return Math.max(Math.min(input, max), min);
}

Math.lerp = function(a, b, t){
  	return (1-t)*a + t*b;
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

// Hyperbolic norm to Poincare norm.
Math.hyperbolicToPoincare = function(h){
	return Math.tanh(0.5 * h);
}

// Poincare norm to klein norm.
Math.poincareToKlein = function(p){
	var mag = 2/(1+p*p);
	return p*mag;
}

// Spherical norm to steregraphic norm.
Math.sphericalToStereographic = function(s){
	return Math.tan(0.5 * s);
}

// Steregraphic norm to gnomonic norm.
Math.stereographicToGnomonic = function(s){
	var mag = 1/(1-s*s);
	return s*mag;
}

//----------------------------------------------------------------------
//	Dot Product
//----------------------------------------------------------------------
THREE.Vector4.prototype.sphericalDot = function(v){
	return this.x*v.x + this.y*v.y + this.z*v.z + this.w *v.w;
}

THREE.Vector4.prototype.lorentzDot = function(v){
	return this.x * v.x + this.y * v.y + this.z * v.z - this.w * v.w;
}

THREE.Vector4.prototype.geometryDot = function(g, v){
	if(g === Geometry.Spherical) return this.sphericalDot(v);
	else if(g === Geometry.Hyperbolic) return this.lorentzDot(v);
	else return this.dot(v);
}

//----------------------------------------------------------------------
//	Norm & Normalize
//----------------------------------------------------------------------
THREE.Vector4.prototype.geometryLength = function(g){
	return Math.sqrt(Math.abs(this.geometryDot(g,this)));
}

THREE.Vector4.prototype.geometryNormalize = function(g){
	return this.divideScalar(this.geometryLength(g));
}

//----------------------------------------------------------------------
//	Matrix Operations
//----------------------------------------------------------------------
THREE.Matrix4.prototype.add = function (m) {
  	this.set.apply(this, [].map.call(this.elements, function (c, i) { return c + m.elements[i] }));
};

THREE.Matrix4.prototype.gramSchmidt = function(g){
	if(g === Geometry.Hyperbolic){ //Only necessary in hyperbolic space
		var m = this.transpose(); 
		var n = m.elements; //elements are stored in column major order we need row major
		var temp = new THREE.Vector4();
		var temp2 = new THREE.Vector4();
		for (var i = 0; i<4; i++) {  ///normalize row
			var invRowNorm = 1.0 / temp.fromArray(n.slice(4*i, 4*i+4)).geometryLength(g);
			for (var l = 0; l<4; l++) {
				n[4*i + l] = n[4*i + l] * invRowNorm;
			}
			for (var j = i+1; j<4; j++) { // subtract component of ith vector from later vectors
				var component = temp.fromArray(n.slice(4*i, 4*i+4)).geometryDot(g, temp2.fromArray(n.slice(4*j, 4*j+4)));
				for (var l = 0; l<4; l++) {
					n[4*j + l] -= component * n[4*i + l];
				}
			}
		}
		m.elements = n;
		this.elements = m.transpose().elements;
	}
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
function translateByVector(g,v) { // trickery stolen from Jeff Weeks' Curved Spaces app
  	var dx = v.x;
  	var dy = v.y;
	var dz = v.z;
	var len = Math.sqrt(dx*dx + dy*dy + dz*dz);

	var m03 = dx;
	var m13 = dy;
	var m23 = dz;
	var c1 = Math.sinh(len);
	var c2 = Math.cosh(len) - 1;

	if( g == Geometry.Euclidean )
	{
		m03 = m13 = m23 = c2 = 0;
		c1 = len;
	}
	else if( g == Geometry.Spherical )
	{
		m03 = -m03;
		m13 = -m13;
		m23 = -m23;
		c1 = Math.sin(len);
		c2 = 1.0 - Math.cos(len);
	}
  	
  	if (len == 0) return new THREE.Matrix4().identity();
  	else{
      dx /= len;
      dy /= len;
      dz /= len;
      var m = new THREE.Matrix4().set(
        0, 0, 0, m03,
        0, 0, 0, m13,
        0, 0, 0, m23,
        dx,dy,dz, 0);
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
//	Signed Distance Fields
//-----------------------------------------------------------------------------------------------------------------------------

// A horosphere can be constructed by offseting from a standard horosphere.
// Our standard horosphere will have a center in the direction of lightPoint
// and go through the origin. Negative offsets will "shrink" it.
function horosphereHSDF( samplePoint, lightPoint, offset )
{
	// Why is sign of lorentzDot opposite here and in glsl?
	//var dot = -samplePoint.lorentzDot(lightPoint);
	var dot = -samplePoint.geometryDot(g_geometry, lightPoint);
	return Math.log( dot ) - offset;
}

function geodesicPlaneHSDF(samplePoint, dualPoint, offset)
{
	//var dot = -samplePoint.lorentzDot(dualPoint);
	var dot = -samplePoint.geometryDot(g_geometry, dualPoint);
	return Math.asinh( dot ) - offset;
}

//-----------------------------------------------------------------------------------------------------------------------------
//	Helper Functions
//-----------------------------------------------------------------------------------------------------------------------------

var halfIdealCubeWidthKlein = 0.5773502692;
var idealCubeCornerKlein = new THREE.Vector4(halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, 1.0);

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