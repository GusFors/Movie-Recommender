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
            ],  
            'cflags_cc': [
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
            ],  
            'cflags_cc': [
            ],
        }
    ]
}