hwajeon
=======

Artisanal name by @duggan


Presents a pretty graph visualisation of the JSON that chef_handler can output.
This uses a zoomable D3 sunburst partition graph so that a Chef JSON file can be broken down
into cookbooks, recipies and resources.

Each element has a elapsed time attached to it and will give a very good idea what resource is
taking longer.

chef_handler does not log everything (such as slowness in opening / writing to logs along the way)
so there will always be a discrepancy between chef_handler total elapsed_time and what
the graph gets by adding up each individual element.


Installation:

Setup nginx / apache with a virtualhost pointing to this folder - This is required so the XHR
in D3 can happen to fetch the local JSON file, otherwise it barfs about CORS problems.

Beyond that all you need is Ruby to run `transform.rb`

Usage:

To parse all the available chef json files run `ruby transform.rb`

To process only one file and have it automagically appended to available-run.json and others do
`ruby transform chef-123456.json`

The system is pretty smart about not duplicating entries so it is safe to parse the same
file multiple times.
