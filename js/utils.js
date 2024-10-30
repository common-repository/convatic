( function( $, window ) {
	var CV_Utils = function() {

		/**
		 * Returns true if an email is valid
		 */
		this.valid_email = function( email ) { 
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test( email );
		};

        this.deparam = function( params, coerce ) {
            var obj = {},
            coerce_types = { 'true': !0, 'false': !1, 'null': null };

            // Iterate over all name=value pairs.
            $.each( params.replace( /\+/g, ' ' ).split( '&' ), function(j,v){
                var param = v.split( '=' ),
                    key = decodeURIComponent( param[0] ),
                    val,
                    cur = obj,
                    i = 0,
                    keys = key.split( '][' ),
                    keys_last = keys.length - 1;

                if ( /\[/.test( keys[0] ) && /\]$/.test( keys[ keys_last ] ) ) {
                     // Remove the trailing ] from the last keys part.
                    keys[ keys_last ] = keys[ keys_last ].replace( /\]$/, '' );

                    keys = keys.shift().split('[').concat( keys );

                    keys_last = keys.length - 1;
                } else {
                    keys_last = 0;
                }

                if ( param.length === 2 ) {
                    val = decodeURIComponent( param[1] );

                    // Coerce values.
                    if ( coerce ) {
                        val = val && !isNaN(val)            ? +val              // number
                            : val === 'undefined'             ? undefined         // undefined
                            : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
                            : val;                                                // string
                    }

                    if ( keys_last ) {
                        for ( ; i <= keys_last; i++ ) {
                            key = keys[i] === '' ? cur.length : keys[i];
                            cur = cur[key] = i < keys_last ? cur[key] || ( keys[i+1] && isNaN( keys[i+1] ) ? {} : [] ) : val;
                        }

                    } else {

                        if ( $.isArray( obj[key] ) ) {
                            // val is already an array, so push on the next value.
                            obj[key].push( val );

                        } else if ( obj[key] !== undefined ) {
                            // val isn't an array, but since a second value has been specified,
                            // convert val into an array.
                            obj[key] = [ obj[key], val ];

                        } else {
                            obj[key] = val;
                        }
                    }

                } else if ( key ) {
                    obj[key] = coerce ? undefined : '';
                }
            } );

            return obj;
        };
	};

	window.CV_Utils = new CV_Utils();
} )( jQuery, window );