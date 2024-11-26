# Pandas Leveraging Cython
# Pandas uses Cython, a Python-to-C transpiler, to optimize its operations.

import pandas as pd

# Create a DataFrame
df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})

# Vectorized operation
df['C'] = df['A'] + df['B']  # Cython-optimized addition

print(df)
# Here, adding two columns in Pandas doesn’t involve Python loops—it’s handled by Cython-compiled functions.





