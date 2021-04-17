---
layout: page
title: Attributes, Skills & Proficiencies
---

# Attributes, Skills & Proficies #

Characters are measured by physical attributes, their knowledge in trained skills, and their expertise with proficiencies.


## Attributes ##

Attributes are the physical and mental characteristics of the player that measures one specific innate aspect of the character. These attributes can infer bonus or penalties on certain actions the character attempts.

**Attribute Score** is the numeric value that a player assigns to an attribute. This is general measure of the attribute. This typically ranges from 1 - 6 where 3 is an average human being, 6 is near peak human capability, and 1 is barely existent.

**Attribute Modifier** is a number calculated from Attribute Score. This is the number used when adding a bonus or penalty to rolls. This is calculated by subtracting 3 from the Attribute Score.

**Attribute Roll** is a number calculated from the Attribute Score to determine the maximum number of dice for a pure attribute roll, similar to a proficiency. This is calculated by dividing the Attribute by 2.

| Attribute | Description |
{% for attr in site.data.attributes %}
| ---------------------- | ----------------------------- | 
{% for attr in site.data.attributes -%}
| {{attr.display_name}} | {{attr.description}}         |
{% endfor -%}



{% endfor %}
