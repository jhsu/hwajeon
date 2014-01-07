drawSidebar()

/* Setup defaults for the chart */
var width = 660,
    height = 700,
    radius = Math.min(width, height) / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
    color = d3.scale.category10();
    padding = 5

var svg = d3.select("#chart").append("svg")
  svg
  .attr("width", width + padding * 2)
  .attr("height", height + padding * 2)
.append("g")
  .attr("transform", "translate(" + [radius + padding, radius + padding] + ")")
   .on('mouseleave', function() {
        // When a user moves outside the main container we revert the sidebar
        load()
    })

var partition = d3.layout.partition()
    .sort(function(a, b) { return d3.ascending(a.value, b.value); })
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

function unique(value, index, self) {
    return self.indexOf(value) === index;
}

function transform(data) {
    // See if the data needs to be transformed
    if ("all_resources" in data) {
        machine_data = {}
        machine_data['instance_role'] = data['node']['normal']['instance_role']
        //machine_data['hostname'] = data['node']['automatic']['cloud']['public_hostname']
        machine_data['hostname'] = ''

        machine_data['provider'] = 'Unknown'
        machine_data['instance_size'] = 'Unknown'
        machine_data['image_id'] = 'Unknown'
        machine_data['location'] = 'Unknown'
        machine_data['platform'] = data['node']['automatic']['platform']
        machine_data['platform_version'] = data['node']['automatic']['platform_version']

        if ('cloud' in data['node']['automatic'] &&
            data['node']['automatic']['cloud']['provider'] == 'ec2'
        ) {
          machine_data['provider'] = data['node']['automatic']['cloud']['provider']
          machine_data['instance_size'] = data['node']['automatic']['ec2']['instance_type']
          machine_data['image_id'] = data['node']['automatic']['ec2']['ami_id']
          machine_data['location'] = data['node']['automatic']['ec2']['placement_availability_zone']
        }

        env = {}
        // Cluster Cookbooks
        if ('engineyard' in data['node']['normal']) {
          // env['email'] = data['node']['normal']['alert_email']
          ey = data['node']['normal']['engineyard']
          environment = ey['environment']
          env['name'] = environment['name']
          // env['stack'] = "ubuntu-precise-0.2" # environment['stack']
        } else {
          // env['email'] = data['node']['normal']['alert_email']
          // env['name'] = data['node']['normal']['environment']['name']
          // env['stack'] = data['node']['normal']['environment']['stack']
        }

        // data['node']['normal']['total_memory_mb']
        // data['node']['automatic']['cpu'] # bunch more data under here

        data3 = {}
        data3['children'] = []
        data3['elapsed_time'] = data['elapsed_time']
        data3['size'] = data3['elapsed_time']
        data3['start_time'] = data['start_time']
        data3['end_time'] = data['end_time']
        data3["instance_vars"] = data["node"]
        data3['name'] = data["node"]["name"]
        data3['instance'] = machine_data
        data3['env'] = env

        cookbooks = data['all_resources'].map(function(item) {
            return item["instance_vars"]["cookbook_name"]
        })
        // dedup
        cookbooks = cookbooks.filter(unique)

        cookbooks.forEach(function (cookbook) {
            cresources = data['all_resources'].filter(function(resource) {
                return resource["instance_vars"]["cookbook_name"] == cookbook
            })

            cdata = {}
            cdata["instance_vars"] = { "name": cookbook }
            cdata['name'] = cookbook
            cdata['elapsed_time'] = cresources[0]['instance_vars']['elapsed_time']
            cdata['size'] = cdata['elapsed_time']
            cdata["children"] = []

            recipes = cresources.map(function(item) {
                return item["instance_vars"]["recipe_name"]
            })
            // dedup
            recipes = recipes.filter(unique)

            recipes.forEach(function (recipe) {
              rresources = cresources.filter(function(resource) {
                return resource["instance_vars"]["recipe_name"] === recipe
              })

              rdata = {}
              rdata["instance_vars"] = { "name": recipe }
              rdata['name'] = recipe
              rdata['elapsed_time'] = rresources[0]['instance_vars']['elapsed_time']
              rdata['size'] = rdata['elapsed_time']
              rdata["children"] = []
              rresources.forEach(function (resource) {
                resource['name'] = resource['instance_vars']['name']
                resource['elapsed_time'] = resource['instance_vars']['elapsed_time']
                resource['size'] = resource['elapsed_time']
                rdata["children"].push(resource)
              })

              cdata['children'].push(rdata)
            })

            data3['children'].push(cdata)
        })

        return data3
    }
    return data
}

function draw(file) {
  ext = '.json'
  if (file.slice(-4) == 'json') {
    ext = ''
  }

  d3.json(file + ext, function(error, data) {
    if (error) {
      alert(error.statusText + " " + error.status + " - " + file + ".json");
      return console.warn(error);
    }

    data = transform(data)

    var svg = d3.select("#chart").select('svg').selectAll('g')
    // FIXME remove this when we figure out to update properly
    svg.selectAll('path').remove()
    var path = svg.datum(data).selectAll("path").data(partition.nodes)

    path.enter()
    .append("path")
      .each(function (d, i) {
        // Make sure the path id is in the object
        d.id = i
      })
      .attr("id", function(d, i) { return "path-" + i; })
      .attr("d", arc)
      .style("fill", function(d) {
        // Use name and id as many names can be identical
        node = (d.children ? d : d.parent)
        return color(node.name + node.id);
      })
      .style("cursor", function(d) { return !d.children ? null : "pointer"; })
      .on("mouseover", mouseover)
      .on('mouseout', mouseout)
      .on('click', click);

      path.exit().remove()

      // Depends on the path variable
      function click(d) {
        updateSidebar(d)

        // Make sure the file name is still set
        hash = loadHash()
        setHash(d.id, hash.file)

        // No point in clicking into a childrenless node
        if (!d.children) {
          return;
        }

        path
          .transition()
          .duration(750)
          .attrTween("d", arcTween(d));

        // Use name and id as many names can be identical
        if (d.depth > 0) {
            path.style("fill", function(d) { return color(d.name + d.id); })
        } else{
            path.style("fill", function(d) {
              node = (d.children ? d : d.parent)
              return color(node.name + node.id);
            })
        }
      }

      function mouseover(d) {
        updateSidebar(d)
        tooltip_text = '<div>'+d.name+'</div>  <div>'+d3.round(d.value, 3)+' secs</div>';
        tooltip.show([d3.event.clientX,d3.event.clientY], tooltip_text)
        setPulsate(d.id)
      }

      function mouseout(d) {
        tooltip.cleanup()
        clearPulsate(d.id)
      }

      // Set the initial node
      load()
    });

  // Interpolate the scales!
  function arcTween(d) {
    var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
        yd = d3.interpolate(y.domain(), [d.y, 1]),
        yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
    return function(d, i) {
      return i
          ? function(t) { return arc(d); }
          : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
    };
  }
}

// Graph event code
function load() {
  var hash = loadHash()
  if (d3.select('#path-' + hash.id).empty() === true) {
    hash.id = 0
  }

  updateSidebar(d3.select('#path-' + hash.id).datum())
  fakeClick(hash.id)
}

function pulsate(node, original) {
    var color = d3.rgb(original)
    node
      .transition()
      .duration(700)
      .style('fill', color.darker(0.5))
      .transition()
      .duration(300)
      .style('fill', original)
}

function setPulsate(context) {
  if (typeof pulsateInterval !== 'undefined') {
    clearInterval(pulsateInterval)
    pulsateInterval = 0
  }

  var id = context
  if (typeof context === 'object') {
    var id = d3.select(context).attr('id')
  }

  var node = d3.select('#path-' + id)
  original = node.style('fill')
  pulsateInterval = setInterval(function(){ pulsate(node, original) } , 1000);
}

function clearPulsate(context) {
  var id = context
  if (typeof context === 'object') {
    var id = d3.select(context).attr('id')
  }

  // Fix the color back
  d3.select('#path-' + id).style('fill', original)

  if (typeof pulsateInterval !== 'undefined') {
    clearInterval(pulsateInterval)
    pulsateInterval = 0
  }
}

function loadHash() {
  var id = 0,
      file = null
  var hash = location.hash.substring(1);
  if (hash != "") {
    // Check for filename
    if (hash.match('/')) {
      var split = hash.split('/', 2)
      var file = split[0],
          id = parseInt(split[1])
    } else {
      var id = parseInt(hash)
    }
  }

  return {'id': id, 'file': file}
}

function setHash(id, file) {
    var output = id
    if (file !== null) {
      var output = file + '/' + id
    }

    location.hash = output
}

function fakeClick(id) {
    // Fake click the element. Could be replaced with jquery trigger()
    var event = document.createEvent("SVGEvents");
    event.initEvent("click",true,true);
    d3.select('#path-' + id).node().dispatchEvent(event);

    // Make sure the file name is still set
    setHash(id, loadHash().file)
}

function drawSidebar() {
  // Reduce the requirement for sidebar HTML in the main template
  var sidebar = d3.select('#chart').append('div').attr('id', 'sidebar')
  var top = sidebar.append('div').attr('id', 'top')
  var item = top.append('div').classed('item', true)
  item.append('div').classed('circle', true)
  item.append('span').classed('name', true)
  var size = item.append('div').classed('size', true)
  size.append('span').classed('time', true)
  size.append('span').text(' Seconds')
  item.append('div').classed('toggle', true)
  item.append('div').classed('extra', true)
}

function updateSidebar(d) {
    // Cleanup sidebar
    d3.select('#children').remove()
    d3.select('#sidebar').append('div').attr('id', 'children')

    var node = d3.select('#path-' + d.id)
    d3.select('#top .item .circle').style('background-color', node.style('fill'))
    d3.select('#top .item .name').text(d.name)
    d3.select('#top .item .time').text(d3.round(d.value, 3))
    d3.select('#top .item .toggle').text('')
    // Setup instance information
    var extra = d3.select('#top .item .extra')
    extra.text('')

    // Show / hide instance info
    if (typeof d.instance !== 'undefined' && typeof d.env !== 'undefined') {
      var div = d3.select('#top .item .toggle')
      div.text('Toggle Instance Information').on('click', function() {
       swap = (extra.style('display') === 'block' ? 'none' : 'block')
       extra.style('display', swap)
      })
    }

    if (typeof d.instance !== 'undefined') {
      extra.append('p').text('Instance')
      extra.append('div').html('<strong>Start Time:</strong>&nbsp;' + d['start_time'])
      extra.append('div').html('<strong>End Time:</strong>&nbsp;' + d['end_time'])
      extra.append('div').html('<strong>Chef Run Time:</strong>&nbsp;' + d['elapsed_time'] + ' Seconds')
      extra.append('div').html('<strong>Hostname:</strong>&nbsp;' + d.instance['hostname'])
      extra.append('div').html('<strong>Role:</strong>&nbsp;' + d.instance['instance_role'])
      extra.append('div').html('<strong>Provider:</strong>&nbsp;' + d.instance['provider'])
      if (d.instance['provider'] === 'ec2'){
        extra.append('div').html('<strong>Location:</strong>:&nbsp;' + d.instance['location'])
        extra.append('div').html('<strong>Size:</strong>&nbsp;' + d.instance['instance_size'])
        extra.append('div').html('<strong>Image:</strong>&nbsp;' + d.instance['image_id'])
      }
    }

    if (typeof d.env !== 'undefined') {
      extra.append('p').text('Environment')
      extra.append('div').html('<strong>Owner:</strong>&nbsp;' + d.env['email'])
      extra.append('div').html('<strong>Env Name:</strong>&nbsp;' + d.env['name'])
      extra.append('div').html('<strong>Stack:</strong>&nbsp;' + d.env['stack'])
    }


    // If no children then stop seeking
    if (!d.children) {
      node = d.instance_vars
      // Build up info about the node
      var extra = d3.select('.extra')
      if (
        node.resource_name === 'package' ||
        node.resource_name === 'gem_package'
      ) {
        if (typeof node.action === 'array') {
            action = node.action[0]
        } else {
            action = node.action
        }

        type = 'APT '
        if (node.resource_name === 'gem_package') {
            type = 'Gem '
        }

        html = '<strong>' + type + 'Package ' + action + ':</strong><br/>' + node.package_name + ' - '
        if (node.version) {
          html += 'v' + node.version
        } else {
          html += 'Already installed'
        }
        extra.append('div').html(html)
     } else {
        if (typeof node.action === 'array') {
            action = node.join(', ')
        } else {
            action = node.action
        }

        extra.append('div').html('<strong>Action:</strong><br/>' + action)

       if (node.command) {
          extra.append('div').html('<strong>Command:</strong><br/>' + node.command)
       }

       if (node.resource_name == 'file') {
         html  = '<strong>Path:</strong><br/>'
         html += node.path + '<br/>'
         html += 'Owner: ' + node.owner + '<br/>'
         html += 'Group: ' + node.group + '<br/>'
         html += 'Mode: ' + node.mode + '<br/>'
         extra.append('div').html(html)
       }

       if (node.code) {
         extra.append('div').html('<strong>Code:</strong><br/>' + node.code)
       }

       if (node.source) {
          extra.append('div').html('<strong>Source:</strong><br/>' + node.source)
       }

        if (node.resource_name == 'apt_repository') {
          html =  '<strong>Adding Apt Repository</strong><br/>'
          html += 'URI: ' + node.uri + '<br/>'
          html += 'Keyserver: ' + node.keyserver + '<br/>'
          html += 'GPG Key: ' + node.key + '<br/>'
          html += 'Distribution: ' + node.distribution + '<br/>'
          extra.append('div').html(html)
        }
      }

      if (node.source_line) {
        extra.append('div').html('<strong>Recipe Line:</strong><br/>' + node.source_line)
      }

      return;
    }

    // Sort based on size (time)
    children = d.children
    children.sort(function(a, b) { return d3.ascending(a.value, b.value); })

    children_div = d3.select('#children')
    for (var i = children.length - 1; i >= 0; i -= 1) {
        child = children[i]
        node = d3.select('#path-' + child.id)

        div = children_div.append('div')
        div.classed('item', 'item')
        div.attr('id', child.id)
        div.append('div').classed('circle', 'circle').style('background-color', node.style('fill'))
        div.append('span').classed('name', 'name').text(child.name)
        div.on('click', function(d) {
            id = d3.select(this).attr('id')
            fakeClick(id)
        })
        div.on('mouseover', function() {
            setPulsate(this)
        })
        div.on('mouseout', function() {
          clearPulsate(this)
        })

        time = div.append('div').classed('size', 'size')
        time.append('span').classed('time', 'time').text(d3.round(child.value, 3))
        time.append('span').text('Seconds')
    }

}
