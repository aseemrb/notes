---
layout: default
title: Eigenvalues and Eigenvectors
parent: Fundamentals
grand_parent: Linear Algebra
nav_order: 3
permalink: /linear-algebra/fundamentals/eigenvectors
---

## Definition
For a matrix $A$, if there exists a vector $v$ such that $Av = \lambda v$ for some scalar $\lambda$, then $\lambda$ is called an eigenvalue and $v$ is called an eigenvector of $A$.

Naturally, eigenvalues are defined <span class="text-green-200">only for square matrices</span> because for non-square matrices, the transformation changes the dimensions of the resulting vector, hence $Av \neq \lambda v$ for any pair of $(\lambda, v)$. Normally, for an $n\times n$ matrix, there are $n$ independent eigenvectors with $Ax_i = \lambda_ix_i$.

## Properties
The key property of eigenvectors can be seen by looking at $A^k$ for some positive integer $k$. Let's say $x$ is an eigenvector of $A$ with eigenvalue $\lambda$. Then we have

$$A^kx = A^{k-1}(\lambda x) = \lambda (A^{k-1}x) = \dots = \lambda^kx.$$

Thus, if $x$ is an eigenvector of $A$ with eigenvalue $\lambda$ then $x$ is also an eigenvector of $A^k$ with eigenvalue $\lambda^k$. This also tells us another key fact about matrices:

| <span class="fs-4 text-green-200">Claim</span> |
|:---------------|
| If 0 is an eigenvalue of $A$, then $A^{-1}$ does not exist. In other words, A is not invertible. |

| <span class="fs-4 text-green-200">Proof</span> |
|:---------------|
| An intuitive way to see this is to consider the eigenvector $x$ associated with eigenvalue $\lambda$. We have that $A^{-1}x = (1/\lambda) x$. So if $\lambda = 0$ then $A^{-1}$ is not defined.
More rigorously, if 0 is eigenvalue, it means that there exists a non-zero vector $x$ such that $Ax = 0$. Hence, the null space of $A$ is non-trivial (contains something other than the zero vector), and so $A$ is a dimension reducing transformation. This also means that $\det A = 0$. For more, check out the [rank-nullity theorem](https://en.wikipedia.org/wiki/Rank%E2%80%93nullity_theorem). |

The $n$ independent eigenvectors of $A$ form a basis for $\mathbb{R}^n$, so any vector $v$ can be expressed as a linear combination of the eigenvectors $x_i$:

$$V = \sum_{i=1}^{n} c_ix_i.$$

## Similarity

A matrix $B$ is said to be <span class="text-green-200">similar to $A$</span> if
$B = M^{-1}AM$ for some invertible matrix $M$.

| <span class="fs-4 text-green-200">Claim</span> |
|:---------------|
| If $B$ is similar to $A$, then they have the same eigenvalues. |

<table>
<thead><tr><th style="text-align: left"><span class="fs-4 text-green-200">Proof</span></th></tr></thead>
<tbody>
  <tr>
    <td>
    Let $y$ be an eigenvector of $B$ with eigenvalue $\lambda$. Then we have $By=\lambda y$. Taking $B=M^{-1}AM$ we see that
    $$\begin{align*}
    \lambda(My) &= M\lambda y \\
    &= MBy \\
    &= MM^{-1}AMy \\
    &= A(My)
    \end{align*}.$$

    Hence, $\lambda$ is also an eigenvalue of $A$ with eigenvector $My$.
    </td>
  </tr>
</tbody>
</table>

This simple result is very useful in computation. For example, a software like MATLAB will use a sequence of matrices $M_1, M_2, \ldots, M_k$ and reduce $A$ to $B_k$ where $B_0 = A$ and $B_i = M_i^{-1}B_{i-1}M_i$ for $i>0$. This sequence can be chosen carefully so as to <span class="text-green-200">make $B_k$ a diagonal matrix</span>, hence, the eigenvalues show up on the diagonal. This helps us calculate the eigenvalues of a matrix much faster.

For a matrix $A$, the <span class="text-green-200">eigenspace</span> associated with a set of eigenvalues is defined to be the subspace spanned by the eigenvectors associated with those eigenvalues.

Some obvious but important facts are as follows:

- The sum of the eigenvalues of $A$ is ${\rm Trace}(A)$, which is the sum of the elements on the diagonal.
- The product of the eigenvalues of $A$ is $\det A$.
- In general, eigenvalues of $A + B$ or $AB$ cannot be inferred directly from eigenvalues of $A$ and $B$.

The first two facts can be proved easily using the characteristic polynomial $P(\lambda) = \det(A - \lambda I) = 0$. We know that the sum of the roots of such a polynomial is determined by the coefficient of $\lambda^{n-1}$, $n$ being the degree of the polynomial. Also, the constant term in the polynomial determines the product of the roots.

## Symmetric matrices
If $S$ is a symmetric matrix, then
- Eigenvalues of $S$ are real if $S$ is real.
- Eigenvectors of $S$ are orthogonal.
- We may have a full set of eigenvectors even if some eigenvalues are repeated. For example, consider the identity matrix. It has only one eigenvalue, $\lambda=1$, but every vector is an eigenvector.

Let $S$ be an $n\times n$ symmetric matrix with eigenvalues $\lambda_1, \ldots, \lambda_n$. If we consider the matrix

$$\Lambda = \begin{pmatrix}
    \lambda_1 & \dots & 0 \\
    \vdots & \ddots & \vdots \\
    0 & \dots & \lambda_n
    \end{pmatrix},
$$

we see that $S$ and $\Lambda$ are [similar matrices](#similarity). This means that there must be an $M$ such that $S = M^{-1}\Lambda M$. It is not hard to see that $M$ is the eigenvector matrix (columns of $M$ are eigenvectors of $S$), and we have the [spectral decomposition](../factorization/#spectral-decomposition) $S = Q\Lambda Q^{\rm T}$.


## General matrices

For a general square matrix $A$ (may not be symmetric), we can factorize it as

$$A = X\Lambda X^{-1}.$$

where $X$ is the eigenvector matrix and $\Lambda$ it the diagonal eigenvalue matrix. This factorization is another way to look at the fact that the eigenvectors of powers of $A$ are the same as that of $A$, with powered eigenvalues. It is only when $A$ is symmetric that we can use $X^{-1} = X^{\rm T}$, since the eigenvectors are orthogonal in that case.
