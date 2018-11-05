//
// A file for utility functions not related to a particular geometry.
//

var Geometry = Object.freeze({ "Spherical": 1, "Euclidean": 2, "Hyperbolic": 3 });

// Infinity-safe pi/n function.
function PiOverNSafe(n)
{
	return n == -1 ? 0 : Math.PI / n;
}

// Returns the geometry induced by a polygon with p sides, q meeting at each vertex.
function GetGeometry2D(p,q)
{
	var test = 1.0 / p + 1.0 / q;
	if( test > 0.5 )
		return Geometry.Spherical;
	else if( test == 0.5 )
		return Geometry.Euclidean;

	return Geometry.Hyperbolic;
}

// Get the length of the side of a triangle opposite alpha, given the three angles of the triangle.
// NOTE: This does not work in Euclidean geometry!
function GetTriangleSide( g, alpha, beta, gamma )
{
  switch( g )
  {
    case Geometry.Spherical:
      {
        // Spherical law of cosines
        return Math.acos( ( Math.cos( alpha ) + Math.cos( beta ) * Math.cos( gamma ) ) / ( Math.sin( beta ) * Math.sin( gamma ) ) );
      }
    case Geometry.Euclidean:
      {
        // Not determined in this geometry.
        return 0.0;
      }
    case Geometry.Hyperbolic:
      {
        // Hyperbolic law of cosines
        // http://en.wikipedia.org/wiki/Hyperbolic_law_of_cosines
        return Math.acosh( ( Math.cos( alpha ) + Math.cos( beta ) * Math.cos( gamma ) ) / ( Math.sin( beta ) * Math.sin( gamma ) ) );
      }
  }

  return 0.0;
}

/// In the induced geometry.
function GetTriangleHypotenuse( p, q )
{
  let g = GetGeometry2D( p, q );
  if( g == Geometry.Euclidean )
    return EuclideanHypotenuse;

  // We have a 2,q,p triangle, where the right angle alpha 
  // is opposite the hypotenuse (the length we want).
  let alpha = Math.PI / 2;
  let beta = PiOverNSafe( q );
  let gamma = PiOverNSafe( p );
  return GetTriangleSide( g, alpha, beta, gamma );
}

/// Get the side length opposite angle PI/P,
/// In the induced geometry.
function GetTrianglePSide( p, q )
{
  let g = GetGeometry2D( p, q );

  let alpha = Math.PI / 2;
  let beta = PiOverNSafe( q );
  let gamma = PiOverNSafe( p );	// The one we want.
  if( g == Geometry.Euclidean )
    return EuclideanHypotenuse * Math.sin( gamma );
  return GetTriangleSide( g, gamma, beta, alpha );
}

/// Get the side length opposite angle PI/Q,
/// In the induced geometry.
function GetTriangleQSide( p, q )
{
  let g = GetGeometry2D( p, q );

  let alpha = Math.PI / 2;
  let beta = PiOverNSafe( q );	// The one we want.
  let gamma = PiOverNSafe( p );
  if( g == Geometry.Euclidean )
    return EuclideanHypotenuse * Math.sin( beta );
  return GetTriangleSide( g, beta, gamma, alpha );
}

var EuclideanHypotenuse = 1.0/3;
var DiskRadius = 1;
function TilingNormalizedCircumRadius( p, q )
{
  let hypot = GetTriangleHypotenuse( p, q );
  switch( GetGeometry2D( p, q ) )
  {
    case Geometry.Spherical:
      return Math.sphericalToStereographic( hypot ) * DiskRadius;

    case Geometry.Euclidean:
      return EuclideanHypotenuse;

    case Geometry.Hyperbolic:
    {
      if( hypot = Number.POSITIVE_INFINITY )
        return DiskRadius;

      return Math.hyperbolicToPoincare( hypot ) * DiskRadius;
    }
  }

  return 1;
}

// Returns the geometry induced by a {p,q} polyhedron, r meeting at each edge.
function GetGeometry(p, q, r)
{
	var t1 = Math.sin(PiOverNSafe(p)) * Math.sin(PiOverNSafe(r));
	var t2 = Math.cos(PiOverNSafe(q));

	if( p == 4 && q == 3 && r == 4 )
		return Geometry.Euclidean;

	if( t1 > t2 )
		return Geometry.Spherical;

	return Geometry.Hyperbolic;
}

// Helper function for in-radius, mid-radius, and circum-radius
// These are from Coxeter's paper classifying paracompact honeycombs
function Pi_hpq(p, q)
{
	var pi = Math.PI;
	var pip = PiOverNSafe(p);
	var piq = PiOverNSafe(q);

	var temp = Math.pow(Math.cos(pip), 2) + Math.pow(Math.cos(piq), 2);
	var hab = pi / Math.acos(Math.sqrt(temp));

	var pi_hpq = pi / hab;
	return pi_hpq;
}

var m_euclideanScale = 1.0;

// Returns the in-radius of a {p,q,r} honeycomb, in the induced geometry
function InRadius(p, q, r)
{
	var pip = PiOverNSafe(p);
	var pir = PiOverNSafe(r);

	var pi_hpq = Pi_hpq(p, q);
	var inRadius = Math.sin(pip) * Math.cos(pir) / Math.sin(pi_hpq);

	switch( GetGeometry( p, q, r ) )
	{
		case Geometry.Hyperbolic:
			return Math.acosh( inRadius );
		case Geometry.Euclidean:
			return m_euclideanScale;
		case Geometry.Spherical:
			return Math.acos( inRadius );
	}
}

// Returns the mid-radius of a {p,q,r} honeycomb, in the induced geometry
function MidRadius(p, q, r)
{
	var pir = PiOverNSafe(r);

	var inrad = InRadius(p, q, r);

	switch( GetGeometry( p, q, r ) )
	{
		case Geometry.Hyperbolic:
			return Math.asinh( Math.sinh(inrad) / Math.sin(pir) );
		case Geometry.Euclidean:
			return Math.sqrt( 2 ) * m_euclideanScale;
		case Geometry.Spherical:
			return Math.asin( Math.sin(inrad) / Math.sin(pir) );
	}
}