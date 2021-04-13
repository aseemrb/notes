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

## Discrete probability space
As an example, let $\Omega$ be a set that is at most countable and $\mc{F}$ be a $\sigma$-field on it. Let $p$ be a function on $\Omega$ such that $p(\omega)\ge 0$ for all $\omega\in\Omega$ and $\sum_{\omega\in\Omega}p(\omega)=1$. Then we can define a probability measure $\prob(A)=\sum{\omega\in A}p(\omega)$ for all $A\in \mc{F}$.

In this case, $(\Omega, \mc{F}, \prob)$ is called a <span class="text-red-100">discrete probability space</span> since $\Omega$ is at most countable. Note here that the function $p$ itself is not the measure, it is not a set function. The measure function is $\prob$, which gives us a way to <span class="text-red-100">measure the content in a measurable set</span>. What do we mean by a measurable set? It simply means an event; recall that any set in the $\sigma$-field is an event.

In simpler words, a probability measure assigns a number to all events, and in that sense, lets us measure those events.

## More properties
- <span class="text-red-100">Continuity.</span> When we say $A_n\uparrow A$, it means that $\\{A_n\\}$ is a non-decreasing and converging sequence of events; i.e., for each $i\ge 1$, $A_i\subseteq A_{i+1}$ with $\lim_{n\to\infty}A_n=A$. Similarly, $A_n\downarrow A$ denotes a non-increasing sequence of events converging to $A$. For a sequence of events $\\{A_n\\}$,

    $$A_n \uparrow A \text{ or } A_n\downarrow A \implies \lim_{n\to\infty}\prob(A_n)=\prob(A).$$
- <span class="text-red-100">Boole's identity.</span> Also called the <span class="text-red-100">union bound</span>. For a set of events $A_1,A_2,\ldots\in\mc{F}$,

    $$\prob(\cup_i A_i)\le \sum_i\prob(A_i).$$

| <span class="fs-4 text-green-100">Exercise</span> |
|:---------------|
| Prove the continuity property of probability measures described above. |
| *<span class="text-red-100">Hint:</span> Use countable additivity (property 3) by constructing a sequence of disjoint sets from $\\{A_n\\}$.* |
