import * as CANNON from 'cannon';


CANNON.Quaternion.prototype.slerp = function( qb, t ) {

    if ( t === 0 ) return this;
    if ( t === 1 ) return this.copy( qb );

    const x = this._x, y = this._y, z = this._z, w = this._w;

    // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

    let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

    if ( cosHalfTheta < 0 ) {

        this._w = - qb._w;
        this._x = - qb._x;
        this._y = - qb._y;
        this._z = - qb._z;

        cosHalfTheta = - cosHalfTheta;

    } else {

        this.copy( qb );

    }

    if ( cosHalfTheta >= 1.0 ) {

        this._w = w;
        this._x = x;
        this._y = y;
        this._z = z;

        return this;

    }

    const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

    if ( sqrSinHalfTheta <= Number.EPSILON ) {

        const s = 1 - t;
        this._w = s * w + t * this._w;
        this._x = s * x + t * this._x;
        this._y = s * y + t * this._y;
        this._z = s * z + t * this._z;

        this.normalize(); // normalize calls _onChangeCallback()

        return this;

    }

    const sinHalfTheta = Math.sqrt( sqrSinHalfTheta );
    const halfTheta = Math.atan2( sinHalfTheta, cosHalfTheta );
    const ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta,
        ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;

    this._w = ( w * ratioA + this._w * ratioB );
    this._x = ( x * ratioA + this._x * ratioB );
    this._y = ( y * ratioA + this._y * ratioB );
    this._z = ( z * ratioA + this._z * ratioB );

    return this;

}