(function() {

  var tooltip = window.tooltip = {}

  tooltip.show = function(pos, content, gravity, dist, parentContainer, classes) {

    var container = d3.select('body').selectAll('.tooltip').data([1])

    container.enter().append('div').attr('class', 'tooltip ' + (classes ? classes : 'xy-tooltip'))

    container.html(content)

    gravity = gravity || 'n'
    dist = dist || 20

    var body = document.getElementsByTagName('body')[0]

    var height = parseInt(container[0][0].offsetHeight)
    , width = parseInt(container[0][0].offsetWidth)
    , windowWidth = window.innerWidth
    , windowHeight = window.innerHeight
    , scrollTop = body.scrollTop
    , scrollLeft = body.scrollLeft
    , left = 0
    , top = 0


    switch (gravity) {
      case 'e':
      left = pos[0] - width - dist
      top = pos[1] - (height / 2)
      if (left < scrollLeft) left = pos[0] + dist
        if (top < scrollTop) top = scrollTop + 5
          if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5
            break
          case 'w':
          left = pos[0] + dist
          top = pos[1] - (height / 2)
          if (left + width > windowWidth) left = pos[0] - width - dist
            if (top < scrollTop) top = scrollTop + 5
              if (top + height > scrollTop + windowHeight) top = scrollTop - height - 5
                break
              case 's':
              left = pos[0] - (width / 2)
              top = pos[1] + dist
              if (left < scrollLeft) left = scrollLeft + 5
                if (left + width > windowWidth) left = windowWidth - width - 5
                  if (top + height > scrollTop + windowHeight) top = pos[1] - height - dist
                    break
                  case 'n':
                  left = pos[0] - (width / 2)
                  top = pos[1] - height - dist
                  if (left < scrollLeft) left = scrollLeft + 5
                    if (left + width > windowWidth) left = windowWidth - width - 5
                      if (scrollTop > top) top = pos[1] + 20
                        break
                    }


                    container.style('left', left+'px')
                    container.style('top', top+'px')

                    return container
                  }

                  tooltip.cleanup = function() {
      // Find the tooltips, mark them for removal by this class (so other tooltip functions won't find it)
      var tooltips = d3.selectAll('.tooltip').attr('class','tooltip-pending-removal').transition().duration(250).style('opacity',0).remove()

    }
  })()
