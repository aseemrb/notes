---
layout: default
title: Orthogonal Matrices
parent: Fundamentals
grand_parent: Linear Algebra
nav_order: 2
permalink: /linear-algebra/fundamentals/orthogonality
---

Let a matrix $Q$ have orthonormal columns. The most important property of such a matrix is that

$$Q^{\rm T}Q = I.$$

But what about $QQ^{\rm T}$? A little thought reveals that $QQ^{\rm T} = I$ only if $Q$ is a square matrix, but not in general. In this square case, $Q$ is called orthogonal (or orthonormal). It's confusing to say orthogonal when we actually mean orthonormal, but most results rely on the fact that a bunch of orthogonal vectors $v_i$ can be made orthonormal by scaling them to have $\lVert v_i\rVert = 1$. Hence, in a lot of places we see the word orthogonal being used when the authors actually mean orthonormal.


## Orthogonality

| <span class="fs-4 text-green-100">Claim</span> |
|:---------------|
| For any vector $x$, $\lVert Qx\rVert = \lVert x\rVert$. In other words, $Q$ as a transformation does not change the length of any vector. |

| <span class="fs-4 text-green-100">Proof</span> |
|:---------------|
| See that $\lVert Qx\rVert = (Qx)^{\rm T}(Qx) = x^{\rm T}Q^{\rm T}Qx = x^{\rm T}x = \lVert x\rVert$, since $Q^{\rm T}Q = I$.|

A simple example of a $2\times 2$ orthogonal matrix is the rotation matrix
$$Q = \begin{pmatrix}
    \cos\theta & -\sin\theta \\
    \sin\theta & \cos\theta
    \end{pmatrix}
$$,
or the reflection matrix
$$Q = \begin{pmatrix}
    \cos\theta & \sin\theta \\
    \sin\theta & -\cos\theta
    \end{pmatrix}.
$$

The rotation matrix simple rotates a vector by $\theta$ in the anti-clockwise direction, while the reflection matrix reflects a vector about a mirror placed on a line of slope $\tan(\theta/2)$ passing through the origin.

Side note: these reflections are called <span class="text-green-100">Householder reflections</span>.

## Householder reflections
Start with a unit vector $u$, so $u^{\rm T}u = 1$. The Householder reflections are defined to be a family of symmetric orthogonal matrices as follows:

$$H = I - 2uu^{\rm T}.$$

It is easy to see that $H$ is orthogonal by checking that $H^{\rm T}H = I$.

## Hadamard matrices
Define the $2$-dimensional Hadamard matrix by

$$H_2 =
    \begin{pmatrix}
    1 & 1 \\
    1 & -1
    \end{pmatrix}.$$

Then define $$H_{2^{n+1}} = \begin{pmatrix}
    H_{2^n} & H_{2^n} \\
    H_{2^n} & -H_{2^n}
    \end{pmatrix}$$
for all $n > 1$.

This gives a construction of these matrices for any power of 2. But in general, it is [conjectured](https://en.wikipedia.org/wiki/Hadamard_matrix#Hadamard_conjecture) that Hadamard matrices for any multiple of 4 exist. These matrices are known to be orthogonal.


## Utility
Orthogonal matrices are good because they don't change the magnitude of vectors, so a transformation by an orthogonal matrix will not overflow and keep things nice. Therefore, these matrices are important in computational linear algebra problems. We also know that the eigenvectors of a symmetric matrix are a natural source of orthogonal matrices, and hence a lot of things revolve around eigenvectors.

