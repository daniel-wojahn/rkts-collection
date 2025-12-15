#!/usr/bin/env python3
"""
Create a symbolic link to XML files in the static directory
This ensures XML files are accessible through the web server
"""

import os
import sys
import shutil

def create_symlink():
    # Get the base directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Source directory (XML files)
    xml_dir = os.path.join(base_dir, 'xml_files')
    
    # Target directory (in static)
    target_dir = os.path.join(base_dir, 'static', 'xml_files')
    
    # Check if source directory exists
    if not os.path.exists(xml_dir):
        print(f"Error: Source directory {xml_dir} does not exist")
        return False
    
    # Remove target if it exists
    if os.path.exists(target_dir):
        if os.path.islink(target_dir):
            os.unlink(target_dir)
        elif os.path.isdir(target_dir):
            shutil.rmtree(target_dir)
        else:
            os.remove(target_dir)
    
    # Create symbolic link
    try:
        # For Windows
        if sys.platform == 'win32':
            import subprocess
            subprocess.check_call(['mklink', '/D', target_dir, xml_dir], shell=True)
        # For Unix-like systems
        else:
            os.symlink(xml_dir, target_dir)
        
        print(f"Created symbolic link: {target_dir} -> {xml_dir}")
        return True
    except Exception as e:
        print(f"Error creating symbolic link: {str(e)}")
        return False

if __name__ == "__main__":
    create_symlink()
