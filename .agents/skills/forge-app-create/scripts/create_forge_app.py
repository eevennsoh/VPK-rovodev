#!/usr/bin/env python3
"""
Automated Forge App Creation Script
Wraps 'forge create' command with non-interactive mode and better error handling.

Run from the skill directory: python -m scripts.create_forge_app
"""

import subprocess
import sys
import argparse
import os
import re
import json

# Relative imports — scripts/ is a package; run as python -m scripts.create_forge_app from skill dir
from . import list_templates as list_templates_module
from . import get_dev_spaces as get_dev_spaces_module

def validate_prerequisites():
    """Check if Forge CLI and Node.js are available"""
    try:
        subprocess.run(['forge', '--version'], capture_output=True, check=True)
        subprocess.run(['node', '-v'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def validate_template(template_name):
    """
    Validate that a template name is valid by checking against the official registry
    Returns (is_valid, suggestions) tuple
    """
    try:
        templates = list_templates_module.fetch_templates()
        template_names = [t['name'] for t in templates]
        
        if template_name in template_names:
            return True, None
        
        # Find similar templates for suggestion
        words = template_name.lower().replace('-', ' ').split()
        suggestions = []
        for valid_template in template_names:
            valid_words = valid_template.lower().replace('-', ' ').split()
            if any(word in valid_words for word in words):
                suggestions.append(valid_template)
        
        return False, suggestions[:5] if suggestions else template_names[:5]
        
    except Exception as e:
        print(f"⚠️  Could not validate template: {e}")
        return True, None  # Assume valid if validation fails

def discover_dev_spaces():
    """
    Discover available developer spaces using GraphQL API
    Returns a list of {'id': str, 'name': str} dictionaries
    """
    try:
        spaces = get_dev_spaces_module.get_dev_spaces_via_api()
        return spaces if spaces else []
    except Exception as e:
        print(f"⚠️  Could not discover developer spaces: {e}")
        return []

def create_app(template, app_name, output_dir=None, dev_space_id=None):
    """
    Create a Forge app using 'forge create'
    
    Args:
        template: Template name (e.g., 'jira-issue-panel-ui-kit')
        app_name: Name for the new app
        output_dir: Directory to create app in (defaults to current directory)
        dev_space_id: Developer space ID to use (required)
    
    Returns:
        True if successful, False otherwise
    """
    
    if not validate_prerequisites():
        print("❌ Prerequisites missing. Ensure Forge CLI and Node.js v22+ are installed.")
        print("   Install: npm install -g @forge/cli")
        return False
    
    # Validate template
    is_valid, suggestions = validate_template(template)
    if not is_valid:
        print(f"❌ Template '{template}' is not recognized.")
        print(f"\n📋 Did you mean one of these?")
        for suggestion in suggestions:
            print(f"   - {suggestion}")
        print(f"\n💡 To see all available templates, run:")
        print(f"   python -m scripts.list_templates --list")
        return False
    
    if not dev_space_id:
        print("❌ Developer space ID is required. Please use --dev-space-id flag.")
        return False
    
    # Build command
    cmd = ['forge', 'create', '--template', template]
    
    # Add app name as positional argument
    cmd.append(app_name)
    
    # Add developer space if available
    if dev_space_id:
        cmd.extend(['--developer-space-id', dev_space_id])
        cmd.append('--accept-terms')
    
    # Add output directory if specified
    if output_dir:
        cmd.extend(['--directory', output_dir])
    
    try:
        print(f"\n📦 Creating Forge app: {app_name}")
        print(f"📋 Template: {template}")
        result = subprocess.run(cmd, check=True)
        
        app_path = os.path.join(output_dir or '.', app_name) if output_dir else app_name
        print(f"✅ App created successfully at: {app_path}")
        print(f"📝 Next steps:")
        print(f"   1. cd {app_path}")
        print(f"   2. npm install")
        print(f"   3. Customize the code")
        print(f"   4. Deploy with: forge deploy --non-interactive -e development")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create app: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Automated Forge app creation with developer space selection'
    )
    parser.add_argument('--template', required=True, help='Forge template (e.g., jira-issue-panel-ui-kit)')
    parser.add_argument('--name', required=True, help='App name')
    parser.add_argument('--directory', help='Output directory (defaults to current directory)')
    parser.add_argument('--dev-space-id', help='Developer space ID (if not provided, will prompt for selection)')
    
    args = parser.parse_args()
    
    # Step 1: Get developer space ID (either from arg or by discovery + prompt)
    dev_space_id = args.dev_space_id
    
    if not dev_space_id:
        # Step 1a: Discover developer spaces
        print("🔍 Step 1: Discovering your Developer Spaces...\n")
        dev_spaces = discover_dev_spaces()
        
        if not dev_spaces:
            print("\n❌ Could not discover any developer spaces.")
            print("\n📋 Please create a developer space at:")
            print("   https://developer.atlassian.com/console/")
            print("\nThen run this script again, or use 'forge create' interactively:")
            print(f"   forge create --template {args.template} {args.name}")
            sys.exit(1)
        
        # Step 1b: Ask user which dev space to use
        print(f"✅ Found {len(dev_spaces)} developer space(s):\n")
        for i, space in enumerate(dev_spaces, 1):
            print(f"  {i}. {space['name']}")
            print(f"     ID: {space['id']}\n")
        
        if len(dev_spaces) == 1:
            choice = input(f"Use '{dev_spaces[0]['name']}'? [Y/n]: ").strip().lower()
            if choice in ['', 'y', 'yes']:
                dev_space_id = dev_spaces[0]['id']
                print(f"✅ Selected: {dev_spaces[0]['name']}\n")
            else:
                print("❌ Cancelled by user")
                sys.exit(1)
        else:
            while True:
                try:
                    choice = input(f"Select a Developer Space (1-{len(dev_spaces)}): ").strip()
                    idx = int(choice) - 1
                    if 0 <= idx < len(dev_spaces):
                        dev_space_id = dev_spaces[idx]['id']
                        print(f"✅ Selected: {dev_spaces[idx]['name']}\n")
                        break
                    else:
                        print(f"❌ Please enter a number between 1 and {len(dev_spaces)}")
                except ValueError:
                    print("❌ Please enter a valid number")
                except KeyboardInterrupt:
                    print("\n❌ Cancelled by user")
                    sys.exit(1)
    
    # Step 2: Create the app with the selected developer space
    print(f"📦 Step 2: Creating Forge app with selected developer space...\n")
    success = create_app(args.template, args.name, args.directory, dev_space_id)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
