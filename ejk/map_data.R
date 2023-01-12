# set working directory to the folder containing this script
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# load required packages
library(tidyverse)
library(sf)
library(lubridate)

######
# subdistrict map
subdistricts <- st_read("subdistrict_boundaries/BGD_adm3.shp")

glimpse(subdistricts)

# quick map
ggplot() + 
  geom_sf(data = subdistricts)

# check projection
st_crs(subdistricts)


######
# ejk data
ejk <- read_csv("processed_data/ejk_edit6.csv")

glimpse(ejk)

# convert to sf object
ejk_sf <- ejk %>%
  st_as_sf(coords = c("long","lat"),
           crs = st_crs("EPSG:4326"))


###########
# hexbin
hexgrid <- st_make_grid(subdistricts,
                        0.2, # you can experiment with grid size but this seemed good
                        crs = st_crs(initial),
                        what = "polygons",
                        square = FALSE)
hexgrid <- st_sf(index = 1:length(lengths(hexgrid)),hexgrid)


# quick map
ggplot() + 
  geom_sf(data = subdistricts, size = 0.5) +
  geom_sf(data = hexgrid, size = 0.1, color = "red", alpha = 0)


# intersection between hexgrid and ejk data
hexgrid_ejk <- st_intersection(hexgrid, ejk_sf)

hexgrid_ejk_summary <- hexgrid_ejk %>%
  st_drop_geometry() %>%
  group_by(index) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))
  
hexgrid_ejk_summary <- inner_join(hexgrid, hexgrid_ejk_summary)

# make sf object with count of incidents and victims in each grid cell and year
hexgrid_ejk_summary_year <- hexgrid_ejk %>%
  mutate(year = year(date2)) %>%
  st_drop_geometry() %>%
  group_by(index, year) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))

hexgrid_ejk_summary_year <- inner_join(hexgrid, hexgrid_ejk_summary_year)

# intersection between subdistricts and ejk data
subdistricts_ejk <- st_intersection(subdistricts, ejk_sf)

# make sf object with count of incidents and victims in each subdistrict 
subdistricts_ejk_summary <- subdistricts_ejk %>%
  st_drop_geometry() %>%
  group_by(ID_3,NAME_3) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))

subdistricts_ejk_summary <- left_join(subdistricts, subdistricts_ejk_summary)

# make sf object with count of incidents and victims in each subdistrict and year
subdistricts_ejk_summary_year <- subdistricts_ejk %>%
  mutate(year = year(date2)) %>%
  st_drop_geometry() %>%
  group_by(ID_3,NAME_3, year) %>%
  summarize(victims = n(),
            incidents = n_distinct(incident_id))

subdistricts_ejk_summary_year  <- left_join(subdistricts,subdistricts_ejk_summary_year)

# filter for 2011 to 2021
hexgrid_ejk_summary_year <- hexgrid_ejk_summary_year %>%
  filter(year >= 2011 & year <= 2021)

# get bounding box for Bangladesh
st_bbox(subdistricts)

# quick hexgrid map
ggplot() +
  geom_sf(data = hexgrid_ejk_summary,
          aes(fill = victims),
          size = 0.1,
          color = "white") +
  scale_fill_distiller(palette = "RdPu", 
                       direction = 1,
                       name = "People killed") +
  theme_void(base_size = 14, base_family = "Arial")

# write to geojson
st_write(subdistricts_ejk, "processed_data/subdistricts_ejk.geojson", delete_dsn = TRUE)
st_write(subdistricts_ejk_summary, "processed_data/subdistricts_ejk_summary.geojson", delete_dsn = TRUE)
st_write(subdistricts_ejk_summary_year, "processed_data/subdistricts_ejk_summary_year.geojson", delete_dsn = TRUE)
st_write(hexgrid_ejk, "processed_data/hexgrid_ejk.geojson", delete_dsn = TRUE)
st_write(hexgrid_ejk_summary, "processed_data/hexgrid_ejk_summary.geojson", delete_dsn = TRUE)
st_write(hexgrid_ejk_summary_year, "processed_data/hexgrid_ejk_summary_year.geojson", delete_dsn = TRUE)
