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

// Poincare norm to hyperbolic norm.
Math.poincareToHyperbolic = function(p){
  return 2*Math.atanh(p);
}

// Poincare norm to Klein norm.
Math.poincareToKlein = function(p){
	var mag = 2/(1+p*p);
	return p*mag;
}

// Klein norm to Poincare norm.
Math.kleinToPoincare = function(k){
  var dot = k*k;
  if(dot > 1)
    dot = 1;
	var mag = (1 - Math.sqrt( 1 - dot )) / dot;
	return k*mag;
}

// Spherical norm to steregraphic norm.
Math.sphericalToStereographic = function(s){
	return Math.tan(0.5 * s);
}

// Steregraphic norm to spherical norm.
Math.stereographicToSpherical = function(s){
  return 2 * Math.atan(s);
}

// Steregraphic norm to gnomonic norm.
Math.stereographicToGnomonic = function(s){
	var mag = 2/(1-s*s);
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

THREE.Vector4.prototype.geometryDirection = function(g, v){
  // FIXME: This doesn't match the shader for spherical geometry.
	var w = v.add(this.multiplyScalar(this.geometryDot(g,v)));
	return w.geometryNormalize(g);
}

THREE.Vector4.prototype.geometryDistance = function(g, v){
	if(g == Geometry.Hyperbolic){
		return Math.acosh(-this.geometryDot(Geometry.Hyperbolic, v));
	}
	else if(g == Geometry.Spherical){
		return Math.acos(this.geometryDot(Geometry.Spherical, v));
	}
	else{
		var diff3 = new THREE.Vector3(this.x - v.x, this.y - v.y, this.z - v.z);
		return diff3.length();
	}
}

//----------------------------------------------------------------------
//	Matrix Operations
//----------------------------------------------------------------------
THREE.Matrix4.prototype.add = function (m) {
  	this.set.apply(this, [].map.call(this.elements, function (c, i) { return c + m.elements[i] }));
};

THREE.Matrix4.prototype.gramSchmidt = function(g){

  if( g === Geometry.Euclidean )
    return;

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

// Constructs a point on the sphere from a direction and a spherical distance.
function constructSpherePoint(direction, distance){
	var w = Math.cos(distance);
	var magSquared = 1 - w * w;
	direction.normalize();
	direction.multiplyScalar(Math.sqrt(magSquared));
	return new THREE.Vector4(direction.x, direction.y, direction.z, w);
}

// Constructs a point on the hyperboloid from a direction and a hyperbolic distance.
function constructHyperboloidPoint(direction, distance){
	var w = Math.cosh(distance);
	var magSquared = w * w - 1;
	direction.normalize();
	direction.multiplyScalar(Math.sqrt(magSquared));
	return new THREE.Vector4(direction.x, direction.y, direction.z, w);
}

function constructPointInGeometry(g, direction, distance) {

  var result = null;
  switch( g_geometry )
  {
  case Geometry.Spherical:
    result = constructSpherePoint(direction, distance);
    break;

  case Geometry.Euclidean:
    result =  direction.normalize().multiplyScalar(distance);
    result = new THREE.Vector4(direction.x, direction.y, direction.z, 1);
    break;

  case Geometry.Hyperbolic:
    result = constructHyperboloidPoint(direction, distance);
    break;
  }
  return result;
}

//----------------------------------------------------------------------
//	Matrix - Generators
//----------------------------------------------------------------------
function translateByVector(g,v) { // trickery stolen from Jeff Weeks' Curved Spaces app
  var dx = v.x; var dy = v.y; var dz = v.z;
  var len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if( len == 0 ) 
    return new THREE.Matrix4().identity();

  dx /= len; dy /= len; dz /= len;
	var m03 = dx; var m13 = dy; var m23 = dz;
	var c1 = Math.sinh(len);
	var c2 = Math.cosh(len) - 1;
	//Conditions for different geometries
	if( g == Geometry.Euclidean ){
		m03 = m13 = m23 = c2 = 0;
		c1 = len;
	}
	else if( g == Geometry.Spherical ){
		m03 = -dx; m13 = -dy; m23 = -dz;
		c1 = Math.sin(len);
		c2 = 1.0 - Math.cos(len);
	}
  
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

//-----------------------------------------------------------------------------------------------------------------------------
//	Signed Distance Fields
//-----------------------------------------------------------------------------------------------------------------------------

function sphereSDF(samplePoint, center, radius){
	return samplePoint.geometryDistance(g_geometry, center) - radius;
}

// A horosphere can be constructed by offseting from a standard horosphere.
// Our standard horosphere will have a center in the direction of lightPoint
// and go through the origin. Negative offsets will "shrink" it.
function horosphereHSDF( samplePoint, lightPoint, offset )
{
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
	var cPos = new THREE.Vector4(0,0,0,1).applyMatrix4( mat ); //central  // fixme: need to make simplex center in simplex case.
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

var PointLightObject = function(g, pos, colorInt){ //position is a euclidean Vector3
  var posMag = pos.length();
  var posDir = pos.normalize();
  lightPositions.push(constructPointInGeometry(g,posDir, posMag));
  lightIntensities.push(colorInt);
}

var EmptyObject = function(){
  globalObjectBoosts.push(new THREE.Matrix4());
  invGlobalObjectBoosts.push(new THREE.Matrix4());
  globalObjectRadii.push(new THREE.Vector3(0,0,0));
  globalObjectTypes.push(-1);
}

var SphereObject = function(g, pos, radii){
  var objMat = new THREE.Matrix4().multiply(translateByVector(g, pos));
  globalObjectBoosts.push(objMat);
  invGlobalObjectBoosts.push(new THREE.Matrix4().getInverse(objMat));
  globalObjectRadii.push(new THREE.Vector3(radii, radii, radii));
  globalObjectTypes.push(0);
}

var EllipsoidObject = function(g, pos, radii){
  var objMat = new THREE.Matrix4().multiply(translateByVector(g, pos));
  var scaleMatrix = new THREE.Matrix4().set(
    radii.x, 0, 0, 0,
    0, radii.y, 0, 0,
    0, 0, radii.z, 0,
    0, 0, 0, 1
  );
  objMat.multiply(scaleMatrix);
  invGlobalObjectBoosts.push(new THREE.Matrix4().getInverse(objMat));
  globalObjectBoosts.push(objMat);
  globalObjectRadii.push(radii);
  globalObjectTypes.push(1);
}