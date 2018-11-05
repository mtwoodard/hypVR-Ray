//
// Adapted from code at https://github.com/roice3/Honeycombs
//
// To start, we will only support {p,q,r} for finite values,
// and only hyperbolic geometry.
// 

class Sphere 
{
  // center and normal are THREE.Vector3
  // radius and offset are numbers
  constructor( center, radius, normal, offset ) 
  {
    if( normal != null )
      normal.normalize();

    this.Center = center;
    this.Radius = radius;
    this.Normal = normal;
    this.Offset = offset;
  }

  IsPlane()
  {
    return this.Normal != null;
  }

  // normal must be unit length!
  // Returns signed distance depending on which side of the plane we are on.
  DistancePointPlane( normal, offset, point )
  {
    let planePoint = normal * offset;
		return ( point - planePoint ).dot( normalVector );
  }

  ReflectPoint( p )
  {
    if( IsPlane )
    {
      let dist = DistancePointPlane( this.Normal, this.Offset, p );
      let offset = this.Normal * dist * -2;
      return p + offset;
    }
    else
    {
      if( p === this.Center )
        return new THREE.Vector3( Number.POSITIVE_INFINITY, 0, 0 );
      if( p.x === Number.POSITIVE_INFINITY )
        return this.Center;

      let v = p - this.Center;
      let d = v.length();
      v.normalize();
      return this.Center + v * ( this.Radius * this.Radius / d );
    }
  }
}

//
// Utility functions
//

// Move an origin based sphere to a new location, in the conformal models.
// Works in all geometries.
function MoveSphere( g, vNonEuclidean, radiusEuclideanOrigin )
{
  if( g == Geometry.Euclidean )
  {
    centerEuclidean = vNonEuclidean;
    radiusEuclidean = radiusEuclideanOrigin;
    return;
  }

  let p = vNonEuclidean.length();
  if( p == 0 )
  {
    // We are at the origin.
    centerEuclidean = vNonEuclidean;
    radiusEuclidean = radiusEuclideanOrigin;
    return;
  }

  let r = radiusEuclideanOrigin;
  let numeratorCenter = g == Geometry.Hyperbolic ? ( 1 - r * r ) : ( 1 + r * r );
  let numeratorRadius = g == Geometry.Hyperbolic ? ( 1 - p * p ) : ( 1 + p * p );

  let center = p * numeratorCenter / ( 1 - p * p * r * r );
  radiusEuclidean = r * numeratorRadius / ( 1 - p * p * r * r );
  centerEuclidean = vNonEuclidean.clone().normalize().multiplyScalar( center );
  return new Sphere( centerEuclidean, radiusEuclidean, null, null );
}

//
// Simplex calculations
// 

// Helper to construct some points we need for calculating simplex facets for a {p,q,r} honeycomb.
// NOTE: This construction is intentionally for the dual {q,p} tiling, hence the reversing of input args.
function TilePoints( q, p )
{
  let circum = TilingNormalizedCircumRadius( p, q );
  let start = new THREE.Vector3( circum, 0, 0 );
  let end = start.clone();
  let axis = new THREE.Vector3( 0, 0, 1 );
  end.applyAxisAngle( axis, 2 * Math.PI / p );

  // Center/radius of curved standard tile segment in the conformal model.
  let piq = PiOverNSafe( q );
  let t1 = Math.PI / p;
  let t2 = Math.PI / 2 - piq - t1;
  let factor = ( Math.tan( t1 ) / Math.tan( t2 ) + 1 ) / 2;
  let center = start.clone().add( end ).multiplyScalar( factor );
  let radius = center.clone().sub( start ).length();

  let mag = center.length() - radius;
  let segMidpoint = center.clone().normalize();
  segMidpoint.multiplyScalar( mag );

  p2 = segMidpoint;
  p3 = p2.clone();
  p3.applyAxisAngle( axis, -Math.PI / 2 );

  return [ start, p2, p3, center, radius ];
}

/// Calculates the 3 mirrors connected to the cell center.
/// This works in all geometries and returns results in the UHS model (or the appropriate analogue).
function InteriorMirrors( p, q )
{
  // Some construction points we need.
  let tilePoints = TilePoints( p, q );
  let p1 = tilePoints[0];
  let p2 = tilePoints[1];
  let p3 = tilePoints[2];

  let cellGeometry = GetGeometry2D( p, q );

  // XZ-plane
  let s1 = new Sphere( null, Number.POSITIVE_INFINITY, new THREE.Vector3( 0, 1, 0 ), 0 );

  let s2 = null;
  if( cellGeometry == Geometry.Euclidean )
  {
    s2 = new Sphere( null, Number.POSITIVE_INFINITY, -p2, p2.length() );
  }
  else if(
    cellGeometry == Geometry.Spherical ||
    cellGeometry == Geometry.Hyperbolic )
  {
    s2 = new Sphere( tilePoints[3], tilePoints[4], null, null );
  }

  let s3 = new Sphere( null, Number.POSITIVE_INFINITY, p3, 0 );

  return [ s2, s1, s3 ];
}

// Get the simplex facets for a {p,q,r} honeycomb
function SimplexFacetsUHS( p, q, r  )
{
  let g = GetGeometry( p, q, r );

  // TODO: Support Euclidean/Spherical
  if( g != Geometry.Hyperbolic )
    return null;

  // Some construction points we need.
  let tilePoints = TilePoints( p, q );
  let p1 = tilePoints[0];
  let p2 = tilePoints[1];
  let p3 = tilePoints[2];

  //
  // Construct in UHS
  //

  let cellGeometry = GetGeometry2D( p, q );
  let cellMirror = null;
  if( cellGeometry == Geometry.Spherical )
  {
    // Spherical trig
    let halfSide = GetTrianglePSide( q, p );
    let mag = Math.sin( halfSide ) / Math.cos( PiOverNSafe( r ) );
    mag = Math.asin( mag );

    // Move mag to p1.
    mag = Math.sphericalToStereographic( mag );
    cellMirror = MoveSphere( Geometry.Spherical, p1, mag );
  }
  else if( cellGeometry == Geometry.Euclidean )
  {
    center = p1;
    radius = p1.dist( p2 ) / Math.cos( PiOverNSafe( r ) );
    cellMirror = new Sphere( center, radius, null, null );
  }
  else if( cellGeometry == Geometry.Hyperbolic )
  {
    let halfSide = GetTrianglePSide( q, p );
    let mag = Math.asinh( Math.sinh( halfSide ) / Math.cos( PiOverNSafe( r ) ) );	// hyperbolic trig
    cellMirror = MoveSphere( p1, DonHatch.h2eNorm( mag ) );
  }

  let interior = InteriorMirrors( p, q );
  return [ interior[0], interior[1], interior[2], cellMirror ];
}

function CreateSimplexGenerators( p, q, r )
{
  let facets = SimplexFacetsUHS( p, q, r );
}