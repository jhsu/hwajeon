// Setup the select boxes - A lot of ugly magic happens here
d3.json("available-runs.json", function(error, data) {
  if (error) {
      alert(error.statusText + " " + error.status + " - available-runs.json");
      return console.warn(error);
    }

  // Parse hash information
  updateFileSelect(data['items']).on('change', function() {
    var file = d3.select(this).property('value')
    draw(file)

    // Force top level path when changing files
    setHash(0, file)
  })

  function item(file) {
     return data['items'].filter(function(d, i) {
        return d.value === file;
     })[0]
  }

  var hash = loadHash()
  if (hash.file === null) {
    var dropdown = d3.selectAll('#run')
    var file = dropdown.node().options[0].__data__.value
    var platform_version = 'All'
    var platform = 'All'
    var provider = 'All'
    var instance_size = 'All'
  } else {
    // update the selected option
    var file = hash.file
    item = item(file)
    var platform_version = item.platform_version
    var platform = item.platform
    var provider = item.provider
    var instance_size = item.instance_size
  }

  // Set data in selects
  versions = []
  if (platform_version !== 'All') {
    versions = versions.concat(data['platforms'][platform])
  }

  // When the platform changes update the platform Versions available
  var dropdown = updateSelect('platform', d3.keys(data['platforms']), platform)
  dropdown.on('change', function() {
    name = d3.select(this).property('value')
    if (name == 'All') {
      updateSelect('platform_version', [], 'All')
      updateFileSelect(data['items'])
      return;
    }

    // Filter platform versions
    updateSelect('platform_version', data['platforms'][name])
    updateFileSelect(data['items'])
  })

  // Filter platform Version
  var dropdown = updateSelect('platform_version', versions, platform_version)
  dropdown.on('change', function() {
    version = d3.select(this).property('value')
    if (version == 'All') {
      updateFileSelect(data['items'])
      return;
    }

    // Filter Files
    updateFileSelect(data['items'])
  })

  // Update Provider
  var dropdown = updateSelect('provider', d3.keys(data['providers']), provider)
  dropdown.on('change', function() {
    provider = d3.select(this).property('value')
    if (provider == 'All') {
      updateSelect('instance_size', [], 'All')
      updateFileSelect(data['items'])
      return;
    }

    // Filter instance sice
    updateSelect('instance_size', data['providers'][provider])
    updateFileSelect(data['items'])
  })

  // Set data in selects
  sizes = []
  if (provider !== 'All') {
    sizes = sizes.concat(data['providers'][provider])
  }

  // Update Instance Size
  var dropdown = updateSelect('instance_size', sizes, instance_size)
  dropdown.on('change', function() {
    size = d3.select(this).property('value')
    if (size == 'All') {
      updateFileSelect(data['items'])
      return;
    }

    updateFileSelect(data['items'])
  })

  // Draw graph based on the selected data file
  draw(file)
})

function updateSelect(selector, items, default_value) {
  var data = ['All'].concat(items)

  var dropdown = d3.select('#' + selector)
  dropdown.selectAll("option").remove()
  var options = dropdown.selectAll("option").data(data)

   options
     .enter()
      .append("option")
      .attr("value", function(d){ return d; })
      .text(function(d){ return d; });

   options.exit().remove()
   if (typeof default_value !== 'undefined') {
     dropdown.property("value", default_value).node().focus()
   }

   return dropdown;
}

// Prime the File selector
function updateFileSelect(items, default_value) {
  // Filter Data
  var filters = [
   'platform',
   'platform_version',
   'provider',
   'instance_size'
  ]
  items = items.filter(function(d, i) {
    var keep = true
    filters.forEach(function (element) {
      value = d3.select('#' + element).property("value")
      if (value === 'All') {
        return;
      }

      if (d[element] !== value) {
        keep = false
      }
    })

    return keep;
  })

  var dropdown = d3.selectAll('#run')
  dropdown.selectAll("option").remove()
  var options = dropdown
              .selectAll("option")
              .data(items.sort(function(a, b) { return d3.descending(a.value, b.value); }))

  options
    .enter()
      .append("option")
      .attr("value", function(d){ return d.value; })
      .text(function(d){ return d.text; });

  options.exit().remove()
  if (typeof default_value !== 'undefined') {
    dropdown.property("value", default_value).node().focus()
  }

  return dropdown;
}
