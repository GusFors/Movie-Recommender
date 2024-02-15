{
    'targets': [
        {
            'target_name': 'addonCsvReader',
            'sources': ['data-utils/addonCsvReader.cc'],
            'include_dirs': ['<!(node -e \'require("nan")\')'],
            'link_settings': {
                'libraries': []
            },
            'cflags': [
                '-funroll-loops'
            ],  
            'cflags_cc': [
                '-funroll-loops'
            ],
        },
        {
            'target_name': 'addonCalculations',
            'sources': ['data-utils/addonCalculations.cc'],
            'include_dirs': ['<!(node -e \'require("nan")\')'],
            'link_settings': {
                'libraries': []
            },
            'cflags': [
                '-funroll-loops'
            ],  
            'cflags_cc': [
                '-funroll-loops'
            ],
        }
    ]
}