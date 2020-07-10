---
layout: default
title: Matrix Factorization
parent: Fundamentals
grand_parent: Linear Algebra
nav_order: 1
permalink: /linear-algebra/fundamentals/factorization
---


There are four very popular factorizations for matrices. In the literature, the word <span class="text-green-200">decomposition</span> is often used instead of <span class="text-green-200">factorization</span>. Note that we denote special types of matrices with special characters. This convention is as follows:

- $S$ denotes a symmetric matrix.
- $Q$ denotes an orthogonal or orthonormal matrix.
- $\Lambda$ denotes the diagonal matrix with [eigenvalues](./eigenvectors) of the matrix being factored.
- $R$ denotes a matrix that is closely related to the rank of the matrix being factored.

## LU decomposition
This is the lower-upper (LU) decomposition applicable to square matrices $A$, and the factorization can be viewed as the matrix form of [Gaussian elimination](https://en.wikipedia.org/wiki/Gaussian_elimination). We write

$$A = LU,$$

where $L$ and $U$ are lower and upper triangular matrices.

If $A$ is symmetric and [positive definite](./psd), then we can find $U=L^{\rm T}$ and have

$$A=LL^{\rm T}.$$

This decomposition is used in algorithms to
- solve a square system of linear equations,
- compute the inverse of a matrix, and
- compute the determinant of a matrix.

## QR decomposition
Here we factor an $m\times n$ matrix $A$ into an $m\times m$ [orthogonal matrix](./orthogonality) $Q$ and an $m\times n$ triangular matrix $R$. A popular method to compute this factorization is the [Gram-Schmidt process](https://en.wikipedia.org/wiki/Gram%E2%80%93Schmidt_process). If $A$ is square then $Q$ is unique. We write

$$A = QR,$$

where $Q$ is orthogonal and $R$ is upper-triangular.

The QR decomposition makes it easy to solve a system of equations $Ax = b$ without inverting the matrix $A$. Since $Q$ is orthogonal, we have $Q^{\rm T} Q = I$, so $Ax=b$ is equivalent to $Rx = Q^{\rm T} b$, which is easier to solve since R is triangular.

## Spectral decomposition
Also called eigendecomposition, this is a factorization of a square matrix into eigenvalues and eigenvectors, $A=VDV^{-1}$, where $D$ is a diagonal matrix with the eigenvalues of $A$ and the columns of $V$ are the corresponding eigenvectors.

Although this factorization is possible for any square matrix with linearly independent eigenvectors, it is usually used for symmetric matrices $S$. Since the <span class="text-green-200">eigenvectors can be made orthonormal for a symmetric matrix</span>, the factorization is written as:

$$S=Q\Lambda Q^{\rm T}.$$

Here $Q = [q_1\ q_2\ \cdots\ q_n]$ with $q_i$ being the column normalized eigenvectors of $S$, and

$$\Lambda = \begin{pmatrix}
    \lambda_1 & \dots & 0 \\
    \vdots & \ddots & \vdots \\
    0 & \dots & \lambda_n
    \end{pmatrix}
$$

with $\lambda_i$ being the eigenvalues of $S$.

Now consider $S = (Q\Lambda)Q^{\rm T}$, and view it as

$$S = \sum ({\rm column\ } i {\rm\ of\ } Q\Lambda) \times ({\rm row\ } i {\rm\ of\ } Q^{\rm T})$$

which is a sum of a bunch of rank-$1$ matrices. The $i^{\rm th}$ column of $Q\Lambda$ is $\lambda_iq_i$ and the $i^{\rm th}$ row of $Q^{\rm T}$ is $q_i^{\rm T}.$ Hence, we can rewrite the above sum as

$$S = \sum \lambda_iq_iq_i^{\rm T}.$$

From this expression, it is easy to see that $Sq_i = \lambda_iq_i$, and thus $(\lambda_i, q_i)$ are the eigenvalue - eigenvector pairs, since the vectors $q_i$ are orthonormal.

## Singular value decomposition
We have a separate [dedicated section about SVD](./svd), but in essence we can factorize any matrix as

$$A = U\Sigma V^{\rm T},$$

where $U$ and $V$ are orthogonal matrices and $\Sigma$ is a non-negative diagonal matrix. The values on the diagonal of $\Sigma$ are called <span class="text-green-200">singular values</span>. Like the spectral decomposition above, the idea of an SVD is to find basis directions along which matrix multiplication is equivalent to scalar multiplication, but this is in general for any matrix instead of a square matrix.
