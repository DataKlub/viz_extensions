Viz Extensions
=================

This app use D3js to create custom visualization that can be used in splunk.
For now it contains only a visualization for the table data which provides a possibilty to show drilldown for subcolumns.
Other custom visualization will be added soon.
An exemple of project monitoring table has been integrated in this app which may give an inspiration.


Input requirements and visualization options
---------
* for each data point, you should give at least its column/row and count, if it's a point of subcolumn, you should also add the column type and its parent column.


* for this version, you should adjust your Splunk outputs to meet the input requirements
* fields demanded : columns, rows, col_type, parent_col, count

+ The explications of each field:
    - `columns` Column name of  data point.
    - `rows` Row name of  data point 


    if the column is a sub-column, you must add the below informations to your Splunk outputs:

    
    - `col_type` if the column is a sub column of a parent, use keyword **sub**
    - `parent_col` the parent column of the sub-column

+ Configurable options for this visualization:
    - `Scale` you can ajust the scale of the whole viz. 
    - `Colors` you can change  the color of each line.
    - `ylabel` The title of your y-axis.
    - `xlabel` The title of your x-axis.


Requirements
---------

* This version has been tested on 6.5.

* App is known to work on Linux,and Mac OS X, but has not been tested on other operating systems. Window should work.



Prerequisites
---------

* Splunk version 6.5 or Higher


Installation instructions
---------

1) copy repo into $SPLUNK_HOME/etc/apps/.

OR
 
2) Install through apps.splunk.com


Recommendations
---------

It is recommend that this be installed on an Search head.


Bug Report/ Feature Request
-----------

[viz_extensions] 

[viz_extensions]:https://github.com/DataKlub/viz_extensions
