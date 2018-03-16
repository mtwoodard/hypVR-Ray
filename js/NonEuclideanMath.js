//
// A file for utility functions not related to a particular geometry.
//

var Geometry = Object.freeze({ "Spherical": 1, "Euclidean": 2, "Hyperbolic": 3 });

// Infinity-safe pi/n function.
function piOverNSafe(n)
{
	return n == -1 ? 0 : Math.PI / n;
}

function GetGeometry(p, q, r)
{
	var t1 = Math.sin(piOverNSafe(p)) * Math.sin(piOverNSafe(r));
	var t2 = Math.cos(piOverNSafe(q));

	// Might need to make this tolerance-safe.
	if( t1 == t2 )
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
	var pip = piOverNSafe(p);
	var piq = piOverNSafe(q);

	var temp = Math.pow(Math.cos(pip), 2) + Math.pow(Math.cos(piq), 2);
	var hab = pi / Math.acos(Math.sqrt(temp));

	var pi_hpq = pi / hab;
	return pi_hpq;
}

// Returns the in-radius of a {p,q,r} honeycomb, in the induced geometry
function inRadius(p, q, r)
{
	var pip = piOverNSafe(p);
	var pir = piOverNSafe(r);

	var pi_hpq = Pi_hpq(p, q);
	var inRadius = Math.sin(pip) * Math.cos(pir) / Math.sin(pi_hpq);

	switch( GetGeometry( p, q, r ) )
	{
		case Geometry.Hyperbolic:
			return Math.acosh( inRadius );
		case Geometry.Spherical:
			return Math.acos( inRadius );
	}
}

// Returns the mid-radius of a {p,q,r} honeycomb, in the induced geometry
function MidRadius(p, q, r)
{
	var pir = piOverNSafe(r);

	var inrad = InRadius(p, q, r);
	var midrad = Math.sinh(inRadius) / Math.sin(pir);

	switch( GetGeometry( p, q, r ) )
	{
		case Geometry.Hyperbolic:
			return Math.asinh( midRadius );
		case Geometry.Spherical:
			return Math.asin( midRadius );
	}
}