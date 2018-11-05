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

  ScaleComponents( s )
  {
    this.A.multiply( s );
    this.B.multiply( s );
    this.C.multiply( s );
    this.D.multiply( s );
  }

  Normalize()
  {
    let k = complex.inverse( math.sqrt( math.substract(
      math.muliply( this.A, this.D ), 
      math.muliply( this.B, this.C ) ) ) );
    this.ScaleComponents( s );
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
    let result = new Mobius( this.D, -this.B, -this.C, this.A );
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
}

class SphericalCoords
	{
		// x,y,z -> r,theta,phi
		CartesianToSpherical( v )
		{
			let r = v.length();
			return new THREE.Vector3(
				r,
				Math.acos( v.z / r ),
				Math.atan2( v.y, v.x ) );
		}

		// r,theta,phi -> x,y,z
		SphericalToCartesian( v )
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
  // Implement me.
  return new THREE.Vector3();
}

// vKlein is a THREE.Vector3
function KleinToPoincare( vKlein )
{
  // Implement me.
  return new THREE.Vector3();
}

function PoincareToUHS( vPoincare )
{
  // Implement me.
  return new THREE.Vector3();
}

function UHSToPoincare( vUHS )
{
  // Implement me.
  return new THREE.Vector3();
}

function PoincareToHyperboloid( vPoincare )
{
  // Implement me.
  return new THREE.Vector4();
}

function HyperboloidToPoincare( vHyperboloid )
{
  // Implement me.
  return new THREE.Vector3();
}

function HyperboloidToUHS( vHyperboloid )
{
  // Implement me.
  return new THREE.Vector3();
}

function UHSToHyperboloid( vUHS )
{
  // Implement me.
  return new THREE.Vector4();
}