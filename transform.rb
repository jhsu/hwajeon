#!/usr/bin/env ruby

require 'multi_json'
require 'pp'

json_file = 'chef.json'
data = MultiJson.load(File.read(json_file))
all_resources = data["all_resources"]
cookbooks = all_resources.map {|r| r["instance_vars"]["cookbook_name"]}.uniq

data3 = {}
data3['elapsed_time'] = data['elapsed_time']
data3['size'] = data3['elapsed_time']
data3['start_time'] = data['start_time']
data3['end_time'] = data['end_time']
data3["instance_vars"] = { "name" => data["node"]["name"] }
data3['name'] = data["node"]["name"]
data3["children"] = []

cookbooks.each do |cookbook|
  cresources = all_resources.select {|r| r["instance_vars"]["cookbook_name"] == cookbook}

  cdata = {}
  cdata["instance_vars"] = { "name" => cookbook}
  cdata['name'] = cookbook
  cdata['elapsed_time'] = cresources.first['instance_vars']['elapsed_time']
  cdata['size'] = cdata['elapsed_time']
  cdata["children"] = []
  pp cookbook
  pp cdata['size']
  recipes = cresources.map {|r| r["instance_vars"]["recipe_name"]}.uniq

  recipes.each do |recipe|
    rresources = cresources.select {|r| r["instance_vars"]["recipe_name"] == recipe}

    rdata = {}
    rdata["instance_vars"] = { "name" => recipe }
    rdata['name'] = recipe
    rdata['elapsed_time'] = rresources.first['instance_vars']['elapsed_time']
    rdata['size'] = rdata['elapsed_time']
    rdata["children"] = []
    pp rdata['size']
    rresources.each do |resource|
      resource['name'] = resource['instance_vars']['name']
      resource['elapsed_time'] = resource['instance_vars']['elapsed_time']
      resource['size'] = resource['elapsed_time']
      rdata["children"] << resource
    end
    cdata["children"] << rdata
  end

  data3["children"] << cdata
end

File.open('flare.json', 'w').write(MultiJson.dump(data3, :pretty => true))
