#!/usr/bin/env python3
"""
Get developer spaces directly from Atlassian GraphQL API
Uses Forge CLI's authentication
"""

import subprocess
import json
import sys
import re

def get_graphql_token():
    """
    Extract GraphQL endpoint and token from Forge CLI
    by running a command that uses authentication
    """
    try:
        # Run forge whoami with verbose to get auth details
        result = subprocess.run(
            ['forge', 'whoami', '--verbose'],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            # Logged in - return indication
            return True
        return False
    except Exception as e:
        print(f"Error checking authentication: {e}")
        return False

def get_dev_spaces_via_api():
    """
    Get developer spaces using GraphQL API endpoint
    This mimics what forge register does but via direct API call
    """
    import json
    import subprocess
    
    print("🔍 Fetching your developer spaces...\n")
    
    # Use the same approach as forge register - run it and parse output
    # We can't easily get the auth token, so we'll use the verbose register approach
    
    temp_manifest = """
modules:
  function:
    - key: resolver
      handler: index.handler
app:
  runtime:
    name: nodejs22.x
"""
    
    import tempfile
    import os
    import shutil
    
    # Create temporary directory with minimal manifest
    with tempfile.TemporaryDirectory() as tmpdir:
        manifest_path = os.path.join(tmpdir, 'manifest.yml')
        index_path = os.path.join(tmpdir, 'index.js')
        
        with open(manifest_path, 'w') as f:
            f.write(temp_manifest)
        
        with open(index_path, 'w') as f:
            f.write("export const handler = async () => {};\n")
        
        # Change to temp directory and run forge register --verbose
        original_cwd = os.getcwd()
        os.chdir(tmpdir)
        
        try:
            result = subprocess.run(
                ['forge', 'register', '--verbose'],
                capture_output=True,
                text=True,
                timeout=20,
                input='\n'  # Try to skip prompts
            )
            
            output = result.stdout + result.stderr
            
            # Parse developer space IDs from output
            dev_spaces = []
            
            # Look for developerSpaceId in output
            id_pattern = r'"developerSpaceId":\s*"([a-f0-9\-]+)"'
            name_pattern = r'"name":\s*"([^"]+)"'
            
            ids = re.findall(id_pattern, output)
            
            # Extract ID and name pairs
            lines = output.split('\n')
            current_id = None
            current_name = None
            
            for line in lines:
                if '"developerSpaceId"' in line:
                    id_match = re.search(r'"developerSpaceId":\s*"([a-f0-9\-]+)"', line)
                    if id_match:
                        current_id = id_match.group(1)
                
                if '"name"' in line and current_id:
                    name_match = re.search(r'"name":\s*"([^"]+)"', line)
                    if name_match:
                        current_name = name_match.group(1)
                        dev_spaces.append({
                            'id': current_id,
                            'name': current_name
                        })
                        current_id = None
                        current_name = None
            
            # Remove duplicates
            seen = set()
            unique_spaces = []
            for space in dev_spaces:
                if space['id'] not in seen:
                    seen.add(space['id'])
                    unique_spaces.append(space)
            
            return unique_spaces
            
        finally:
            os.chdir(original_cwd)

def main():
    """Main entry point"""
    
    # Check authentication
    if not get_graphql_token():
        print("❌ Not authenticated with Forge")
        print("Run: forge login")
        sys.exit(1)
    
    try:
        spaces = get_dev_spaces_via_api()
        
        if spaces:
            print(f"✅ Found {len(spaces)} developer space(s):\n")
            for i, space in enumerate(spaces, 1):
                print(f"{i}. {space['name']}")
                print(f"   ID: {space['id']}\n")
            
            print("JSON Output:")
            print(json.dumps(spaces, indent=2))
            
            # Also print for easy copy-paste
            print("\nFor scripting:")
            for space in spaces:
                print(f"export FORGE_DEV_SPACE_ID='{space['id']}'  # {space['name']}")
        else:
            print("⚠️  No developer spaces found")
            print("Create one at: https://developer.atlassian.com/console/")
            sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error fetching developer spaces: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
