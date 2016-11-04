This custom table visualization give a drillodown of sub-columns for your table data. 

Once your have generated a table of results, your can show them with this visualization.
But for this version, the field names of your splunk outputs are fixed:

+ The explications of each field:
    - `columns` Column name of  data point.
    - `rows` Row name of  data point 
    - `col_type` if the column is a sub column of a parent, use keyword **sub**
    - `parent_col` the parent column of the sub-column

+ Configurable options:
    - `Scale` you can ajust the scale of the whole viz. 
    - `Colors` you can change  the color of each line.
    - `ylabel` The title of your y-axis.
    - `xlabel` The title of your x-axis.
