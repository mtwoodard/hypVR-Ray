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

  static PlaneFromKleinFacet( f )
  {
    return new Sphere( null, null, new THREE.Vector3( f.x, f.y, f.z ), f.w );
  }

  SetPlaneFrom3Points( a, b, c )
  {
    this.Center = null;
    this.Radius = Number.POSITIVE_INFINITY;

    this.Normal = c.clone().sub( a ).cross( b.clone().sub( a ) ).normalize();
    this.Offset = Sphere.DistancePointPlane( this.Normal, 0, a );
  }

  IsPlane()
  {
    return this.Normal != null;
  }

  // normal must be unit length!
  // Returns signed distance depending on which side of the plane we are on.
  static DistancePointPlane( normal, offset, point )
  {
    let planePoint = normal.clone().multiplyScalar( offset );
		return point.clone().sub( planePoint ).dot( normal );
  }

  ReflectPoint( p )
  {
    if( this.IsPlane() )
    {
      let dist = Sphere.DistancePointPlane( this.Normal, this.Offset, p );
      let offset = this.Normal.clone().multiplyScalar( dist * -2 );
      return p.clone().add( offset );
    }
    else
    {
      if( p === this.Center )
        return new THREE.Vector3( Number.POSITIVE_INFINITY, 0, 0 );
      if( p.x === Number.POSITIVE_INFINITY )
        return this.Center;

      let v = p.clone().sub( this.Center );
      let d = v.length();
      v.normalize();
      return this.Center.clone().add(
        v.clone().multiplyScalar( this.Radius * this.Radius / d ) );
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
  let cellGeometry = GetGeometry2D( p, q ); 
  let circum = TilingNormalizedCircumRadius( p, q );
  let start = new THREE.Vector3( circum, 0, 0 );
  let end = start.clone();
  let axis = new THREE.Vector3( 0, 0, 1 );
  end.applyAxisAngle( axis, 2 * Math.PI / p );

  let segMidpoint = null;
  let center = null;
  let radius = 0;
  if( cellGeometry == Geometry.Euclidean )
  {
    segMidpoint = start.clone().add( end ).divideScalar( 2 );
  }
  else
  {
    // Center/radius of curved standard tile segment in the conformal model.
    let piq = PiOverNSafe( q );
    let t1 = Math.PI / p;
    let t2 = Math.PI / 2 - piq - t1;
    let factor = ( Math.tan( t1 ) / Math.tan( t2 ) + 1 ) / 2;
    center = start.clone().add( end ).multiplyScalar( factor );
    radius = center.clone().sub( start ).length();

    let mag = center.length() - radius;
    segMidpoint = center.clone().normalize();
    segMidpoint.multiplyScalar( mag );
  }

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
  let s1 = new Sphere( null, Number.POSITIVE_INFINITY, new THREE.Vector3( 0, -1, 0 ), 0 );

  let s2 = null;
  if( cellGeometry == Geometry.Euclidean )
  {
    s2 = new Sphere( null, Number.POSITIVE_INFINITY, p2, p2.length() );
  }
  else if(
    cellGeometry == Geometry.Spherical ||
    cellGeometry == Geometry.Hyperbolic )
  {
    s2 = new Sphere( tilePoints[3], tilePoints[4], null, null );
  }

  let s3 = new Sphere( null, Number.POSITIVE_INFINITY, p3.negate(), 0 );

  return [ s2, s1, s3 ];
}

// Get the simplex facets for a {p,q,r} honeycomb
function SimplexFacetsUHS( p, q, r )
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
    radius = p1.distanceTo( p2 ) / Math.cos( PiOverNSafe( r ) );
    cellMirror = new Sphere( center, radius, null, null );
  }
  else if( cellGeometry == Geometry.Hyperbolic )
  {
    let halfSide = GetTrianglePSide( q, p );
    let mag = Math.asinh( Math.sinh( halfSide ) / Math.cos( PiOverNSafe( r ) ) );	// hyperbolic trig
    cellMirror = MoveSphere( Geometry.Hyperbolic, p1, Math.hyperbolicToPoincare( mag ) );
  }

  let interior = InteriorMirrors( p, q );
  return [ interior[0], interior[1], interior[2], cellMirror ];
}

function PlanePoints( f )
{
  let mid = f.Normal.clone().multiplyScalar( f.Offset );
  let axis = new THREE.Vector3( 0, 0, 1 );
  let offset = f.Normal.clone().applyAxisAngle( axis, Math.PI / 2 );
  let start = mid.clone().add( offset );
  let end = mid.clone().sub( offset );
  return [start, mid, end];
}

function CirclePoints( cen, rad )
{
  let a = 2*Math.PI/3;
  let p1 = cen.clone().add( new THREE.Vector3( rad, 0, 0 ) );
  let p2 = cen.clone().add( new THREE.Vector3( rad * Math.cos( a ), rad * Math.sin( a ), 0 ) );
  let p3 = cen.clone().add( new THREE.Vector3( rad * Math.cos( 2*a ), rad * Math.sin( 2*a ), 0 ) );
  return [p1, p2 ,p3];
}

function KleinFromUHS( f )
{
  if( f.Radius === Number.POSITIVE_INFINITY && f.Offset < 1e-7 )
  {
    // NOTE: This is not correct in general, but it will work with our construction.
    return new THREE.Vector4( f.Normal.x, f.Normal.y, f.Normal.z, 0.0 );
  }

  let idealPoints = null;
  if( f.Radius == Number.POSITIVE_INFINITY )
  {
    idealPoints = PlanePoints( f )
  }
  else
  {
    idealPoints = CirclePoints( f.Center, f.Radius );
  }

  let plane = new Sphere();
  plane.SetPlaneFrom3Points( 
    UHSToPoincare( idealPoints[0] ), // ok to go to Poincare because these are ideal points.
    UHSToPoincare( idealPoints[1] ),
    UHSToPoincare( idealPoints[2] )
  );

  return new THREE.Vector4( plane.Normal.x, plane.Normal.y, plane.Normal.z, plane.Offset );
}

function NegateKleinFacet( f )
{
  return new THREE.Vector4( -f.x, -f.y, -f.z, f.w );
}

// These are the planar mirrors of the fundamental simplex in the Klein (or analagous) model.
// Order is mirrors opposite: vertex, edge, face, cell.
// The xyz components of a vector give the unit normal of the mirror. The sense will be that the normal points to the outside of the simplex.
// The w component is the offset from the origin.
function SimplexFacetsKlein( p, q, r )
{
  let facetsUHS = SimplexFacetsUHS( p, q, r );
  
  let vertexFacet = KleinFromUHS( facetsUHS[0] ) 
  let edgeFacet = KleinFromUHS( facetsUHS[1] );
  let faceFacet = KleinFromUHS( facetsUHS[2] );
  let cellFacet = KleinFromUHS( facetsUHS[3] );

  let cellGeometry = GetGeometry2D( p, q );
  if( cellGeometry == Geometry.Spherical )
    vertexFacet = NegateKleinFacet( vertexFacet );

  return [vertexFacet, edgeFacet, faceFacet, cellFacet];
}

function PlaneDualPoint( g, fKlein )
{
  if( Math.abs( fKlein.w ) < 1e-7 )
  {
    return new THREE.Vector4( fKlein.x, fKlein.y, fKlein.z, 0.0 );
  }

  let inv = 1.0/fKlein.w;
  let dual = new THREE.Vector4( fKlein.x*inv, fKlein.y*inv, fKlein.z*inv, 1.0 );
  dual.geometryNormalize( g );
  return dual;
}

// Reflect a Minkowski space point in one of our (Klein) simplex facets.
function ReflectInFacet( g, fKlein, vMinkowski )
{
  let plane = PlaneDualPoint( g, fKlein );
  let reflected = vMinkowski.clone().sub( plane.clone().multiplyScalar( 
    2 * plane.geometryDot( g, vMinkowski ) / plane.geometryDot( g, plane ) ) );
  return reflected;
}

// Get one generator defined by a facet as matrices.
// NOTE: Since these are reflections, they are their own inverse.
function OneGen( g, f )
{
  let e1 = new THREE.Vector4( 1, 0, 0, 0 );
  let e2 = new THREE.Vector4( 0, 1, 0, 0 );
  let e3 = new THREE.Vector4( 0, 0, 1, 0 );
  let e4 = new THREE.Vector4( 0, 0, 0, 1 );

  let e1r = ReflectInFacet( g, f, e1 );
  let e2r = ReflectInFacet( g, f, e2 );
  let e3r = ReflectInFacet( g, f, e3 );
  let e4r = ReflectInFacet( g, f, e4 );

  var m = new THREE.Matrix4().set( 
    e1r.x, e2r.x, e3r.x, e4r.x,
    e1r.y, e2r.y, e3r.y, e4r.y,
    e1r.z, e2r.z, e3r.z, e4r.z,
    e1r.w, e2r.w, e3r.w, e4r.w
  );

  m.transpose();  // GLSL constructs matrices with column inputs.
  return m;
}

function SimplexInverseGenerators( g, kleinFacets )
{
  return [
    OneGen( g, kleinFacets[0] ), 
    OneGen( g, kleinFacets[1] ), 
    OneGen( g, kleinFacets[2] ), 
    OneGen( g, kleinFacets[3] ) ]; 
}