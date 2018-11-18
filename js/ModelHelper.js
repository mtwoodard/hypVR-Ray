//
// Adapted from code at https://github.com/roice3/Honeycombs
//

class Mobius 
{
  // All 4 parameters should be a math.complex
  constructor( A, B, C, D ) 
  {
    this.A = A;
    this.B = B;
    this.C = C;
    this.D = D;
  }

  ScaleComponents( k )
  {
    this.A = math.multiply( this.A, k );
    this.B = math.multiply( this.B, k );
    this.C = math.multiply( this.C, k );
    this.D = math.multiply( this.D, k );
  }

  Normalize()
  {
    let k = math.sqrt( math.subtract(
      math.multiply( this.A, this.D ), 
      math.multiply( this.B, this.C ) ) ).inverse();
    this.ScaleComponents( k );
  }

  Apply( z )
  {
    return math.divide(
      math.add( math.multiply( this.A, z ), this.B ),
      math.add( math.multiply( this.C, z ), this.D )
    );
  }

  Inverse()
  {
    let result = new Mobius( this.D, this.B.neg(), this.C.neg(), this.A );
    result.Normalize();
    return result;
  }

  static MobiusPoincareToUHS()
  {
    let t = Math.sqrt(2)/2;
    return new Mobius( 
      math.complex( t, 0 ), math.complex( 0, t ), 
      math.complex( 0, t ), math.complex( t, 0 ) );
  }

  static MobiusUHSToPoincare()
  {
    return Mobius.MobiusPoincareToUHS().Inverse();
  }
}

class SphericalCoords
{
  // x,y,z -> r,theta,phi
  static CartesianToSpherical( v )
  {
    let r = v.length();
    return new THREE.Vector3(
      r,
      Math.acos( v.z / r ),
      Math.atan2( v.y, v.x ) );
  }

  // r,theta,phi -> x,y,z
  static SphericalToCartesian( v )
  {
    return new THREE.Vector3(
      v.x * Math.sin( v.y ) * Math.cos( v.z ),
      v.x * Math.sin( v.y ) * Math.sin( v.z ),
      v.x * Math.cos( v.y ) );
  }
}

// vPoincare is a THREE.Vector3
function PoincareToKlein( vPoincare )
{
  let mag = Math.poincareToKlein( vPoincare.length() );
  return vPoincare.clone().normalize().multiplyScalar( mag );
}

// vKlein is a THREE.Vector3
function KleinToPoincare( vKlein )
{
  let dot = vKlein.dot( vKlein );
  if(dot > 1)
    dot = 1;
  return vKlein.clone().multiplyScalar( (1 - Math.sqrt( 1 - dot )) / dot );
}

// NOTE! This should only be used if m is a transform that preserves the imaginary axis!
function TransformHelper( v, m )
{
  let spherical = SphericalCoords.CartesianToSpherical( v );
  let c1 = math.type.Complex.fromPolar( spherical.x, Math.PI/2 - spherical.y );
  let c2 = m.Apply( c1 ).toPolar();
  let s2 = new THREE.Vector3( c2.r, Math.PI/2 - c2.phi, spherical.z );
  return SphericalCoords.SphericalToCartesian( s2 );
}

function PoincareToUHS( vPoincare )
{
  return TransformHelper( vPoincare, Mobius.MobiusPoincareToUHS() );
}

function UHSToPoincare( vUHS )
{
  return TransformHelper( vUHS, Mobius.MobiusUHSToPoincare() );
}

function KleinToUHS( vKlein )
{
  return PoincareToUHS( KleinToPoincare( vKlein ) );
}

function UHSToKlein( vUHS )
{
  return PoincareToKlein( UHSToPoincare( vUHS ) );
}

function PoincareToHyperboloid( vPoincare )
{
  let temp = vPoincare.dot( vPoincare );
  return new THREE.Vector4(
    2*vPoincare.x / ( 1 - temp ),
    2*vPoincare.y / ( 1 - temp ),
    2*vPoincare.z / ( 1 - temp ),
    ( 1 + temp ) / ( 1 - temp ) );
}

function HyperboloidToPoincare( vHyperboloid )
{
  let t = vHyperboloid.w;
  return new THREE.Vector3(
    vHyperboloid.x / ( 1 + t ),
    vHyperboloid.y / ( 1 + t ),
    vHyperboloid.z / ( 1 + t ) );
}

function HyperboloidToUHS( vHyperboloid )
{
  return PoincareToUHS( HyperboloidToPoincare( vHyperboloid ) );
}

function UHSToHyperboloid( vUHS )
{
  return PoincareToHyperboloid( UHSToPoincare( vUHS ) );
}