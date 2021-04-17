// https://github.com/itsravenous/gaussian-elimination

import { minusOne, zero } from "../rational.js";

function array_fill(i, n, v) {
    var a = [];
    for (; i < n; i++) {
        a.push(v);
    }
    return a;
}

/**
 * Gaussian elimination
 * @param  array A matrix
 * @param  array x vector
 * @return array x solution vector
 */
 export function gauss(A, x) {

    var i, k, j;

    // Just make a single matrix
    for (i=0; i < A.length; i++) { 
        A[i].push(x[i]);
    }
    let n = A.length;
    let colN = A[0].length;

    for (i=0; i < n; i++) { 
        // Search for maximum in this column
        let maxEl = A[i][i].abs(),
            maxRow = i;
        for (k=i+1; k < n; k++) { 
            if (maxEl.less(A[k][i].abs())) {
                maxEl = A[k][i].abs();
                maxRow = k;
            }
        }


        // Swap maximum row with current row (column by column)
        for (k=i; k < colN; k++) { 
            let tmp = A[maxRow][k];
            A[maxRow][k] = A[i][k];
            A[i][k] = tmp;
        }

        // Make all rows below this one 0 in current column
        for (k=i+1; k < n; k++) { 
            let c = A[k][i].div(A[i][i]).mul(minusOne);
            for (j=i; j < colN; j++) { 
                if (i===j) {
                    A[k][j] = zero;
                } else {
                    A[k][j] = A[k][j].add(c.mul(A[i][j]));
                }
            }
        }
    }

    // Solve equation Ax=b for an upper triangular matrix A
    x = array_fill(0, n, zero);
    for (i=n-1; i > -1; i--) { 
        x[i] = A[i][n].div(A[i][i]);
        for (k=i-1; k > -1; k--) { 
            A[k][n] = A[k][n].sub(A[k][i].mul(x[i]));
        }
    }

    return x;
}

// module.exports = gauss;