---
layout: default
title: Positive Definite Matrices
parent: Fundamentals
grand_parent: Linear Algebra
nav_order: 4
permalink: /linear-algebra/fundamentals/psd
---

## Properties
A symmetric matrix $S$ is positive definite (PD), if it has the following equivalent properties. Positive definiteness is a notion of thinking about symmetric matrices as positive or negative in the same sense as one would think about a real number.

- All eigenvalues of $S$ are positive, i.e., $\lambda_i(S) > 0$.
- For any vector $x \neq 0$, the energy contained in $x$ for $S$ is positive, i.e.,

$$x^{\rm T}Sx > 0.$$

- All leading determinants of $S$ are $>0$. Leading determinants are determinants of all square sub-matrices of $S$ with the top-left corner fixed.
- All [pivots](https://en.wikipedia.org/wiki/Pivot_element) in the [Gaussian elimination](https://en.wikipedia.org/wiki/Gaussian_elimination) are $>0$.
- $S$ can be factored as $S = A^{\rm T}A$, where $A$ has independent columns.

## Energy in a vector $x$
For a matrix $S$, the energy is a vector $x$ is defined by $x^{\rm T}Sx$. For example, consider

$$\begin{align*}
x=\begin{pmatrix}a\\b\end{pmatrix}, & & S=\begin{pmatrix}
    3 & 4\\
    4 & 6
    \end{pmatrix}
    \end{align*}.
$$

The corresponding energy is $f(a,b)=x^{\rm T}Sx=3a^2 + 6b^2 + 8ab$. Below is the plot for $f(a,b)$ showing that energy $>0$ for all $a$ and $b$. Thus, the matrix $S$ in this example is positive definite.

![Energy in a vector for S.](/assets/images/linear-algebra/energy.png "Energy in a vector for S.")

On a side note, this can be seen like a loss function that one may try to minimize using something simple like [gradient descent](https://en.wikipedia.org/wiki/Gradient_descent).

If two matrices $A$ and $B$ are PD, then so are the matrices $A+B$ and $A^{-1}$. This can be easily seen by the positive energy property and the fact that the $\lambda_i(A^{-1})=1/\lambda_i(A)$.

## Positive Semi-definite matrices
Semi-definiteness (PSD) is analogous to being non-negative. A matrix is PSD if it satisfies the above [properties](#properties) with a minor change: replace $>0$ with $\ge 0$ in the first four properties, and in the last property, we may have dependent columns in the factor $A$.
