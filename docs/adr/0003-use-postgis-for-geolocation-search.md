# Use PostGIS for geolocation search

Rastro v1 will use Postgres with PostGIS as the source of truth for nearby report, alert, and resource-provider search. Native maps may still render pins and support location picking, but search and alert targeting will use indexed PostGIS radius queries and coarse location cells so Rastro owns its location data, avoids heavy map-provider dependency, and shows approximate public locations by default.
