#!/usr/bin/env ruby

require 'multi_json'
require 'date'
require 'pp'

def update_available(processed_file, info)
  data = {}
  file = 'available-runs.json'
  if File.file?(file)
    data = MultiJson.load(File.read(file))
  end

  # make sure items exist
  if data.has_key?('items') === false
    data['items'] = []
  end

  platform = info['instance']['platform']
  platform_version = info['instance']['platform_version']

  # make sure platform exists
  if data.has_key?('platforms') === false
    data['platforms'] = {}
  end

  if data['platforms'].has_key?(platform) === false
    data['platforms'][platform] = []
  end

  data['platforms'][platform].push(platform_version)
  data['platforms'][platform] = data['platforms'][platform].select{|d| d}.uniq

  provider = info['instance']['provider']
  instance_size = info['instance']['instance_size']

  # make sure platform exists
  if data.has_key?('providers') === false
    data['providers'] = {}
  end

  if data['providers'].has_key?(provider) === false
    data['providers'][provider] = []
  end

  data['providers'][provider].push(instance_size)
  data['providers'][provider] = data['providers'][provider].select{|d| d}.uniq

  # Add item and deduplicate
  data['items'].push({
    'value' => processed_file,
    'text' => processed_file,
    'platform' => platform,
    'platform_version' => platform_version,
    'provider' => provider,
    'instance_size' => instance_size
  })
  data['items'] = data['items'].select{|d| d['value']}.uniq

  File.open(file, 'w').write(MultiJson.dump(data, :pretty => true))
end

def process_file(json_file)
  data = MultiJson.load(File.read(json_file))
  all_resources = data["all_resources"]
  cookbooks = all_resources.map {|r| r["instance_vars"]["cookbook_name"]}.uniq

  machine_data = {}
  machine_data['instance_role'] = data['node']['normal']['instance_role']
  machine_data['hostname'] = data['node']['automatic']['cloud']['public_hostname']

  machine_data['instance_size'] = 'Unknown'
  machine_data['image_id'] = 'Unknown'
  machine_data['location'] = 'Unknown'
  machine_data['platform'] = data['node']['automatic']['platform']
  machine_data['platform_version'] = data['node']['automatic']['platform_version']
  machine_data['provider'] = data['node']['automatic']['cloud']['provider']
  if data['node']['automatic']['cloud']['provider'] == 'ec2'
    machine_data['instance_size'] = data['node']['automatic']['ec2']['instance_type']
    machine_data['image_id'] = data['node']['automatic']['ec2']['ami_id']
    machine_data['location'] = data['node']['automatic']['ec2']['placement_availability_zone']
  end

  env = {}
  env['email'] = data['node']['normal']['alert_email']
  ey = data['node']['normal']['engineyard']
  environment = ey['environment']
  env['name'] = environment['name']
  env['stack'] = "ubuntu-precise-0.2" # environment['stack']

  # data['node']['normal']['total_memory_mb']
  # data['node']['automatic']['cpu'] # bunch more data under here

  data3 = {}
  data3['elapsed_time'] = data['elapsed_time']
  data3['size'] = data3['elapsed_time']
  data3['start_time'] = data['start_time']
  data3['end_time'] = data['end_time']
  data3["instance_vars"] = data["node"]
  data3['name'] = data["node"]["name"]
  data3['instance'] = machine_data
  data3['env'] = env
  data3["children"] = []

  cookbooks.each do |cookbook|
    cresources = all_resources.select {|r| r["instance_vars"]["cookbook_name"] == cookbook}

    cdata = {}
    cdata["instance_vars"] = { "name" => cookbook}
    cdata['name'] = cookbook
    cdata['elapsed_time'] = cresources.first['instance_vars']['elapsed_time']
    cdata['size'] = cdata['elapsed_time']
    cdata["children"] = []
    recipes = cresources.map {|r| r["instance_vars"]["recipe_name"]}.uniq

    recipes.each do |recipe|
      rresources = cresources.select {|r| r["instance_vars"]["recipe_name"] == recipe}

      rdata = {}
      rdata["instance_vars"] = { "name" => recipe }
      rdata['name'] = recipe
      rdata['elapsed_time'] = rresources.first['instance_vars']['elapsed_time']
      rdata['size'] = rdata['elapsed_time']
      rdata["children"] = []
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

  date = DateTime.strptime(data3['start_time'], '%Y-%m-%d %H:%M:%S %z').strftime('%Y-%m-%d_%H:%M:%S')
  name = 'processed-' + date + '-' + data3['name'] + '.json'
  File.open(name, 'w').write(MultiJson.dump(data3, :pretty => true))

  # update available
  update_available(name[0..-6], data3)

  return name
end

# Check if a single file is to be processed or all
if ARGV.any?
  json_file = ARGV.first
  if File.file?(json_file) === false
    print "%s doesn't exist or isn't a file\n" % json_file
    exit
  end

  name = process_file(json_file)
else
  Dir.glob('./chef-*.json') do |json_file|
    name = process_file(json_file)
  end
end
