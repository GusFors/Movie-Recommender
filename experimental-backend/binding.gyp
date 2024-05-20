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
                '-funroll-loops',
                '-O2'
            ],  
            'cflags_cc': [
                '-funroll-loops',
                '-O2'
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
                '-funroll-loops',
                '-O2'
            ],  
            'cflags_cc': [
                '-funroll-loops',
                '-O2'
            ],
        }
    ]
}