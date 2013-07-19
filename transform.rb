#!/usr/bin/env ruby

require 'multi_json'

json_file = 'chef.json'
data = MultiJson.load(File.read(json_file))
all_resources = data["all_resources"]
cookbooks = all_resources.map {|r| r["instance_vars"]["cookbook_name"]}.uniq

data3 = {}
data3["instance_vars"] = { "name" => data["node"]["name"] }
data3["children"] = []

cookbooks.each do |cookbook|
  cdata = {}
  cdata["instance_vars"] = { "name" => cookbook}
  cdata["children"] = []
  cresources = all_resources.select {|r| r["instance_vars"]["cookbook_name"] == cookbook}
  recipes = cresources.map {|r| r["instance_vars"]["recipe_name"]}.uniq

  recipes.each do |recipe|
    rdata = {}
    rdata["instance_vars"] = { "name" => recipe }
    rdata["children"] = []
    rresources = cresources.select {|r| r["instance_vars"]["recipe_name"] == recipe}
    rresources.each do |resource|
      rdata["children"] << resource
    end
    cdata["children"] << rdata
  end

  data3["children"] << cdata
end

File.open('flare.json', 'w').write(MultiJson.dump(data3, :pretty => true))
