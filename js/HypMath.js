//hyperbolic matrix functions

THREE.Matrix4.prototype.add = function (m) {
  this.set.apply(this, [].map.call(this.elements, function (c, i) { return c + m.elements[i] }));
};

THREE.Matrix4.prototype.gramSchmidt = function(g){
	var n = this.elements;
	var temp = new THREE.Vector4();
	var temp2 = new THREE.Vector4();
	for (var i = 0; i<4; i++) {  ///normalise row
		var invRowNorm = 1.0 / normTHREE( g, temp.fromArray(n.slice(4*i, 4*i+4)));
		for (var l = 0; l<4; l++) {
			n[4*i + l] = n[4*i + l] * invRowNorm;
		}
		for (var j = i+1; j<4; j++) { // subtract component of ith vector from later vectors
			var component = dotTHREE( g, temp.fromArray(n.slice(4*i, 4*i+4)), temp2.fromArray(n.slice(4*j, 4*j+4)));
			for (var l = 0; l<4; l++) {
				n[4*j + l] -= component * n[4*i + l];
			}
		}
	}
	this.elements = n;
}

THREE.Vector4.prototype.lorentzDot = function(v){
	return this.x * v.x + this.y * v.y + this.z * v.z - this.w * v.w;
}

THREE.Vector4.prototype.lorentzNormalize = function() {
	var norm = Math.sqrt(Math.abs(this.lorentzDot(this)));
	this.divideScalar( norm );
}


function zeroMatrix4Rotation(mat){
	var matFinal = new THREE.Matrix4();
	return matFinal;
}

function areSameMatrix(mat1, mat2) {  //look only at last column - center of cell
	var delta = 0.01;
	for (var coord=3; coord<16; coord+=4) {
		if (Math.abs(mat1.elements[coord] - mat2.elements[coord]) > delta) {
			return false;
		}
	}
	return true;
}

function isMatrixInArray(mat, matArray) {
	for (var i=0; i<matArray.length; i++) {
		if (areSameMatrix(mat, matArray[i])) {
		// if (i > 3) {
			return true;
		}
	}
	return false;
}

function digitsDepth( digits ) {
	numZeros = 0;
	for (var i = 0; i < digits.length; i++) {
		if ( digits[i] == 0 ) {
			numZeros += 1;
		}
	}
	return digits.length - numZeros;
}

function translateByVector(g,v) { 
	if( g == Geometry.Euclidean )
		return translateByVectorEuclidean( v );

	return translateByVectorHyperbolic( v );
}

function translateByVectorEuclidean(v) { 
	var dx = v.x;
	var dy = v.y;
	var dz = v.z;
	var m = new THREE.Matrix4().set(
	  1.0, 0, 0, 0,
	  0, 1.0, 0, 0,
	  0, 0, 1.0, 0,
	  dx, dy, dz, 1.0 );	
	return m;
}

function translateByVectorHyperbolic(v) { // trickery stolen from Jeff Weeks' Curved Spaces app
  var dx = v.x;
  var dy = v.y;
  var dz = v.z;
  var len = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (len == 0)
  {
    return new THREE.Matrix4().identity();
  }
  else
    {
      dx /= len;
      dy /= len;
      dz /= len;
      var m = new THREE.Matrix4().set(
        0, 0, 0, dx,
        0, 0, 0, dy,
        0, 0, 0, dz,
        dx,dy,dz, 0);
      var m2 = new THREE.Matrix4().copy(m).multiply(m);
      var c1 = Math.sinh(len);
      var c2 = Math.cosh(len) - 1;
      m.multiplyScalar(c1);
      m2.multiplyScalar(c2);
      var result = new THREE.Matrix4().identity();
      result.add(m);
      result.add(m2);
      return result;
    }
}

function getFwdVector() {
  return new THREE.Vector3(0,0,-1);
}
function getRightVector() {
  return new THREE.Vector3(1,0,0);
}
function getUpVector() {
  return new THREE.Vector3(0,1,0);
}

Math.clamp = function(input, min, max)
{
	return Math.max(Math.min(input, max), min);
}

Math.lerp = function(a, b, t){
  return (1-t)*a + t*b;
}

//----------------------------------------------------------------------
// Spherical Math Functions
//----------------------------------------------------------------------
//Array -------------------------------
function sphericalDot( u, v ){
	return u[0]*v[0] + u[1]*v[1] + u[2]*v[2] + u[3]*v[3];
}

//----------------------------------------------------------------------
// Euclidean Math Functions
//----------------------------------------------------------------------
//Array -------------------------------
function euclideanDot( u, v ){
	return u[0]*v[0] + u[1]*v[1] + u[2]*v[2];
}

//----------------------------------------------------------------------
// Hyperbolic Math Functions
//----------------------------------------------------------------------
//Array -------------------------------
function lorentzDot( u, v ){
	return u[0]*v[0] + u[1]*v[1] + u[2]*v[2] - u[3]*v[3];
}

//THREE -------------------------------
function lorentzDotTHREE(u, v) {
	return u.x * v.x + u.y * v.y + u.z * v.z - u.w * v.w;
}

function lorentzNormalizeTHREE(v) {
	var norm = Math.sqrt(Math.abs(lorentzDotTHREE(v, v)));
	return v.divideScalar( norm );
}

//----------------------------------------------------------------------
// Generalized Math Function
//----------------------------------------------------------------------
//Array -------------------------------
function dot(g,u,v) { 
	if( g == Geometry.Spehrical )
		return sphericalDot( u, v );
	if( g == Geometry.Euclidean )
		return euclideanDot( u, v );
	return lorentzDot( u, v );
}

function norm(g, v){
	return Math.sqrt(Math.abs(dot(g,v,v)));
}

function normalize(g, v){
	var norm = norm(g,v);
	return v.map(function(x){x/norm;});
}

//THREE -------------------------------
function dotTHREE(g,u,v){
	if( g != Geometry.Hyperbolic )
		return u.dot(v);
	return lorentzDotTHREE(u,v);
}

function normTHREE(g,v){
	return Math.sqrt(Math.abs(dotTHREE(g,v,v)));
}

function normalizeTHREE(g,v){
	if( g != Geometry.Hyperbolic )
		return v.normalize();
	return lorentzNormalizeTHREE(v);
}

function v_from_vprime(u, vprime){ //NOTE: CHANGE TO DIRECTIONFROM2POINTS
  var out = vprime - lorentzDot(u,vprime)*u;
  return (1.0/norm(out)*out);
}

// Constructs a point on the hyperboloid from a direction and a hyperbolic distance.
function constructHyperboloidPoint(direction, distance)
{
	// acosh(lorentzDot(origin, v)) = distance
	// origin = (0,0,0,1), so lorentzDot = -v.w
	var w = Math.cosh(distance);

	// lorentzDot( v, v ) = 1, so w*w = 1 + x*x + y*y + z*z
	var magSquared = w * w - 1;
	direction.normalize();
	direction.multiplyScalar(Math.sqrt(magSquared));
	return new THREE.Vector4(direction.x, direction.y, direction.z, w);
}

// Given a Poincare norm, returns the hyperbolic norm.
function poincareToHyperbolic( p )
{
	return 2 * Math.atanh(p);
}

// Given a hyperbolic norm, returns the Poincare norm.
function hyperbolicToPoincare( h )
{
	return Math.tanh(.5 * h);
}

// Poincare norm to klein norm.
function poincareToKlein( p )
{
	var mag = 2 / (1 + p*p);
	return p * mag;
}

// Klein norm to poincare norm.
function kleinToPoincare( k )
{
	var dot = k*k;
	if( dot > 1 )
		dot = 1;
	var mag = (1 - Math.sqrt(1 - dot)) / dot;
	return k * mag;
}

var halfIdealCubeWidthKlein = 0.5773502692;
var idealCubeCornerKlein = new THREE.Vector4(halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, halfIdealCubeWidthKlein, 1.0);

// A horosphere can be constructed by offseting from a standard horosphere.
// Our standard horosphere will have a center in the direction of lightPoint
// and go through the origin. Negative offsets will "shrink" it.
function horosphereHSDF( samplePoint, lightPoint, offset )
{
	// Why is sign of lorentzDot opposite here and in glsl?
	var dot = -lorentzDotTHREE(samplePoint, lightPoint);
	return Math.log( dot ) - offset;
}

function geodesicPlaneHSDF(samplePoint, dualPoint, offset)
{
	var dot = -lorentzDotTHREE(samplePoint, dualPoint);
	return Math.asinh( dot ) - offset;
}

///// better GramSchmidt...seem more stable out near infinity
function gramSchmidt( g, m ){
	//var m = mat.elements;
	for (var i = 0; i<4; i++) {  ///normalise row
		var invRowNorm = 1.0 / norm( g, m.slice(4*i, 4*i+4) );
		for (var l = 0; l<4; l++) {
			m[4*i + l] = m[4*i + l] * invRowNorm;
		}
		for (var j = i+1; j<4; j++) { // subtract component of ith vector from later vectors
			var component = dot( g, m.slice(4*i, 4*i+4), m.slice(4*j, 4*j+4) );
			for (var l = 0; l<4; l++) {
				m[4*j + l] -= component * m[4*i + l];
			}
		}
	}
	return m;
}


////////check if we are still inside the central fund dom...

function fakeDist( v ){  //good enough for comparison of distances on the hyperboloid
	return v.x*v.x + v.y*v.y + v.z*v.z;
}

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
