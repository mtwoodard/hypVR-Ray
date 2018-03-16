//hyperbolic matrix functions

THREE.Matrix4.prototype.add = function (m) {
  this.set.apply(this, [].map.call(this.elements, function (c, i) { return c + m.elements[i] }));
};

// function areSameMatrix(mat1, mat2) {
// 	var delta = 0.0001;
// 	for (var coord=0; coord<16; coord++) {
// 		if (Math.abs(mat1.elements[coord] - mat2.elements[coord]) > delta) {
// 			return false;
// 		}
// 	}
// 	return true;
// }

function areSameMatrix(mat1, mat2) {  //look only at last column - center of cell
	var delta = 0.01;
	for (var coord=3; coord<16; coord+=4) {
		if (Math.abs(mat1.elements[coord] - mat2.elements[coord]) > delta) {
			return false;
		}
	}
	// console.log('same matrix')
	// console.log(mat1.elements)
	// console.log(mat2.elements)
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

// function hypDistFromOrigin(v) {
// // put the point onto Klein model
// // hyp dist is arctanh(euclidean dist)
// 	return Math.atanh(Math.sqrt((v.x*v.x + v.y*v.y + v.z*v.z) / (v.w*v.w)));
// }  //dont need this for calculating nearest point to origin - atanh is increasing function

function digitsDepth( digits ) {
	numZeros = 0;
	for (var i = 0; i < digits.length; i++) {
		if ( digits[i] == 0 ) {
			numZeros += 1;
		}
	}
	return digits.length - numZeros;
}

function translateByVector(v) { // trickery stolen from Jeff Weeks' Curved Spaces app
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

function parabolicBy2DVector(v) {  ///  something is wrong here we think...
  var dx = v.x; /// first make parabolic fixing point at infinity in pos z direction
  var dy = v.y;
  var m = new THREE.Matrix4().set(
    0, 0, -dx, dx,
    0, 0, -dy, dy,
    dx, dy, 0, 0,
    dx, dy, 0, 0);
  var m2 = new THREE.Matrix4().copy(m).multiply(m);
  m2.multiplyScalar(0.5);
  var result = new THREE.Matrix4().identity();
  result.add(m);
  result.add(m2);
  //now conjugate to get based on camera orientation
  var cameraM = new THREE.Matrix4();
  cameraM.makeRotationFromQuaternion(virtCamera.quaternion);
  var cameraMinv = new THREE.Matrix4().getInverse(cameraM);

  return cameraM.multiply(result).multiply(cameraMinv);
}

function getFwdVector() {
  return new THREE.Vector3(0,0,1).applyQuaternion(virtCamera.quaternion);
}
function getRightVector() {
  return new THREE.Vector3(-1,0,0).applyQuaternion(virtCamera.quaternion);
}
function getUpVector() {
  return new THREE.Vector3(0,-1,0).applyQuaternion(virtCamera.quaternion);
}

// fastGramSchmidt from Jeff Week's CurvedSpaces. Causes some wobble when far from the origin...

function fastGramSchmidt( m )
{
	//	Numerical errors can accumulate and force aMatrix "out of round",
	//	in the sense that its rows are no longer orthonormal.
	//	This effect is small in spherical and flat spaces,
	//	but can be significant in hyperbolic spaces, especially
	//	if the camera travels far from the origin.

	//	The Gram-Schmidt process consists of rescaling each row to restore
	//	unit length, and subtracting small multiples of one row from another
	//	to restore orthogonality.  Here we carry out a first-order approximation
	//	to the Gram-Schmidt process.  That is, we normalize each row
	//	to unit length, but then assume that the subsequent orthogonalization step
	//	doesn't spoil the unit length.  This assumption will be well satisfied
	//	because small first order changes orthogonal to a given vector affect
	//	its length only to second order.

	// var m = mat.elements;
	var spaceLike = new Float32Array([1,1,1,-1]);
	var timeLike = new Float32Array([-1,-1,-1,1]);

	//	Normalize each row to unit length.
	for (var i = 0; i < 4; i++)
	{
		var metric;
		if (i==3){
			metric = timeLike;
		}
		else {
			metric = spaceLike;
		}

		var innerProduct = 0.0;
		for (var j = 0; j < 4; j++)
			innerProduct += metric[j] * m[4*i + j] * m[4*i + j];

		var factor = 1.0 / Math.sqrt(innerProduct);
		for (var j = 0; j < 4; j++)
			m[4*i + j] *= factor;
	}

	//	Make the rows orthogonal.
	for (var i = 4; i-- > 0; )	//	leaves the last row untouched
	{
		var metric;
		if (i==3){
			metric = timeLike;
		}
		else {
			metric = spaceLike;
		}

		for (var j = i; j-- > 0; )
		{
			var innerProduct = 0.0;
			for (var k = 0; k < 4; k++)
				innerProduct += metric[k] * m[4*i + k] * m[4*j + k];

			for (var k = 0; k < 4; k++)
				m[4*j + k] -= innerProduct * m[4*i + k];
		}
	}
	return m;
}

function lerp(a, b, t){
  return (1-t)*a + t*b;
}

function lorentzDot( u, v ){
	return u[0]*v[0] + u[1]*v[1] + u[2]*v[2] - u[3]*v[3];
}

function norm( v ){
	return Math.sqrt(Math.abs(lorentzDot(v,v)));
}

function v_from_vprime(u, vprime){
  var out = vprime - lorentzDot(u,vprime)*u;
  return (1.0/norm(out)*out);
}

// Helper function for in-radius, mid-radius, and circum-radius functions
function Pi_hpq( p, q, )
{
	var pi = Math.PI;
	var pip = Math.PI / p;
	var piq = Math.PI / q;

	var temp = Math.pow(Math.cos(pip), 2) + Math.pow(Math.cos(piq), 2);
	var hab = pi / Math.acos(Math.sqrt(temp));

	var pi_hpq = pi / hab;
	return pi_hpq;
}

// Returns the hyperbolic in-radius of a hyperbolic {p,q,r} honeycomb
function inRadius(p, q, r)
{
	var pip = Math.PI / p;
	var pir = Math.PI / r;

	var pi_hpq = Pi_hpq(p, q);
	var inRadius = Math.sin(pip) * Math.cos(pir) / Math.sin(pi_hpq);

	return Math.acosh(inRadius);
}

// Given a Poincare norm, returns the hyperbolic norm.
function p2hnorm( pNorm )
{
	return 2 * Math.atanh(pNorm);
}

// Given a hyperbolic norm, returns the Poincare norm.
function h2pNorm( hNorm )
{
	return Math.tanh(.5 * hNorm);
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

///// better GramSchmidt...seem more stable out near infinity

function gramSchmidt( m ){
	//var m = mat.elements;
	for (var i = 0; i<4; i++) {  ///normalise row
		var invRowNorm = 1.0 / norm( m.slice(4*i, 4*i+4) );
		for (var l = 0; l<4; l++) {
			m[4*i + l] = m[4*i + l] * invRowNorm;
		}
		for (var j = i+1; j<4; j++) { // subtract component of ith vector from later vectors
			var component = lorentzDot( m.slice(4*i, 4*i+4), m.slice(4*j, 4*j+4) );
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
