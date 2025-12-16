# Update Catalog Script
# This script fetches and updates the catalog data

# Configuration
$apiUrl = "https://admin.pv.market/api/catalog"
$outputFile = "$PSScriptRoot\catalog.json"

Write-Host "Starting catalog update..." -ForegroundColor Cyan

try {
    # Fetch data from API
    Write-Host "Fetching data from $apiUrl..." -NoNewline
    $response = Invoke-RestMethod -Uri $apiUrl -ErrorAction Stop
    Write-Host " Done" -ForegroundColor Green
    
    # Process and filter the data
    Write-Host "Processing data..." -NoNewline
    $cleanData = $response.products | ForEach-Object {
        $specs = @{}
        if ($_.option_values) {
            $_.option_values | ForEach-Object { 
                $specs[$_.filter_option.option_name] = $_.value 
            }
        }
        
        # Format the product URL
        $productUrl = if ($_.ProductNavigatePath) {
            # Get the last segment of the path
            $lastSlashIndex = $_.ProductNavigatePath.LastIndexOf('/')
            if ($lastSlashIndex -ge 0) {
                $slug = $_.ProductNavigatePath.Substring($lastSlashIndex + 1)
                "https://pv.market/products/$slug"
            } else {
                "https://pv.market/products/$($_.ProductNavigatePath.Trim('/'))"
            }
        } else {
            $null
        }
        
        [PSCustomObject]@{
            id = $_.id
            product_name = $_.product_name
            product_img = $_.product_img
            description = $_.description
            price = $_.more_lowest_price
            base_currency = $_.offers[0].base_currency
            lead_time = if ($_.offers[0].lead_time -ne $null) { "$($_.offers[0].lead_time) weeks" } else { $null }
            country = $_.offers[0].warehouse.from_country.country_name
            pieces_per_pallet = $_.pieces_in_pallet
            pallets_per_container = $_.pallets_in_container
            product_url = $productUrl
            specs = $specs
        }
    }
    
    # Save to file
    $cleanData | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding utf8 -Force
    
    $productCount = $cleanData.Count
    Write-Host " Success! Updated $productCount products in $outputFile" -ForegroundColor Green
} 
catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        Write-Host "HTTP Status: $statusCode $statusDescription" -ForegroundColor Red
    }
    exit 1
}


