---
layout: default
title: \(\sigma\)-Fields
parent: Probability Spaces
grand_parent: Probability Theory
nav_order: 1
permalink: /probability-theory/probability-spaces/sigma-fields
---

| <span class="fs-4 text-green-100">Probability space</span> |
|:---------------|
| A probability space is a triplet $(\Omega, \mc{F}, \prob)$, where $\Omega$ is called the **sample space**, $\mc{F}$ is called a **$\sigma$-field** and $\prob$ is called the **probability measure**.|

## Sample space
This is the set of all possible outcomes of a random experiment. For example, consider the experiment where one rolls a $6$-sided die. Then the sample space will be $\Omega = \\{1, 2, 3, 4, 5, 6\\}$.

## Defining a $\sigma$-field
A set of subsets of $\Omega$, denoted by $\mc{F}$, is called a <span class="text-purple-000">$\sigma$-field on $\Omega$</span> if
- <span class="text-purple-000">$\mc{F}$ contains the sample space.</span>
$\Omega \in \mc{F}$.
- <span class="text-purple-000">$\mc{F}$ is closed under complements.</span>
$A\in\mc{F} \implies A^c\in \mc{F}$.
- <span class="text-purple-000">$\mc{F}$ is closed under countable unions.</span>
$A_1, A_2, \ldots \in \mc{F} \implies \cup_{i=1}^{\infty}A_i\in \mc{F}$.

## Examples
The intuitive way to think about a $\sigma$-field is to view it as a collection (set) of events. <span class="text-purple-000">Every member of $\mc{F}$ is an event</span>. A few examples:
1. The trivial $\sigma$-field given by $\mc{F} = \\{\emptyset, \Omega\\}$, where $\emptyset$ denotes the empty set.
2. Power set of $\Omega$ given by $\mc{F} = \\{2^{\Omega}\\}$, which denotes the collection of all subsets of $\Omega$.
3. For any fixed subset $A\subset\Omega$, the set given by $\mc{F} = \\{\emptyset,A,A^c,\Omega\\}$.
4. The set $\mc{F} = \\{A: A$ is countable or $A^c$ is countable $\\}$.

The four examples above can be verified to be a $\sigma$-field by simply verifying the three properties described above. For example 4, the third property is non-trivial, and can be verified using the following argument: Consider a countable sequence of events $\\{A_i\\}_{i=1}^{\infty}\in\mc{F}$. If all $A_i$ are countable, then $B=\cup_i A_i$ is countable and so $B\in\mc{F}$; whereas, if there exists some $j$ such that $A_j$ is uncountable, it means that $A_j^c$ is countable by definition of $\mc{F}$. Now see that since $A_j\subseteq B=\cup_i A_i$, we have $B^c\subseteq A_j^c$. Hence, $B^c$ is countable, implying that $B\in \mc{F}$ by definition.

## Counterexample
It is natural at this point to ask for an example of a set which is not a $\sigma$-field. Let's construct one!

Let $\Omega = (0, 1]$, and define

$$\mc{B}_0 = \{\text{finite unions of disjoint subintervals of }\Omega\}.$$

At first glance, one might believe that $\mc{B}_0$ is a $\sigma$-field, but it's not. It's actually a <span class="text-purple-000">field</span> (more on that later), but not a $\sigma$-field.

| <span class="fs-4 text-green-100">Exercise 1</span> |
|:---------------|
| Show that $\mc{B}_0$ is not a $\sigma$-field by identifying which property (among the three listed in the definition) breaks.|
