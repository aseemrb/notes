---
layout: default
title: Probability Measures
parent: Probability Spaces
grand_parent: Probability Theory
nav_order: 3
permalink: /probability-theory/probability-spaces/measures
---

Recall that a probability space is a triplet $(\Omega, \mc{F}, \prob)$. We already talked about the sample space $\Omega$ and the $\sigma$-field $\mc{F}$ in great detail. Here we talk about the probability measure $\prob$.

| <span class="fs-4 text-green-100">Probability measure</span> |
|:---------------|
| A set function $\prob$ on a $\sigma$-field $\mc{F}$ is a probability measure if |
| 1. $0\le \prob(A)\le 1$ for all $A\in\mc{F}$.<br>2. $\prob(\emptyset)=0$ and $\prob(\Omega)=1$.<br>3. For a sequence of events $\\{A_i\\}_{i\ge 1}$ that are disjoint sets in $\mc{F}$, $\prob(\cup_i A_i) = \sum_i \prob(A_i)$. |
