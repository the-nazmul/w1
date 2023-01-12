# set working directory to the folder containing this script (requires script to be run in RStudio)
setwd(dirname(rstudioapi::getActiveDocumentContext()$path))

# load required packages
library(tidyverse)
library(readxl)

# process xls files
files <- list.files("data/ejk/xls")

ejk <- tibble()

for (f in files) {
  tmp <- paste0("data/ejk/xls/",f)
  sheets <- excel_sheets(tmp)
  for (s in sheets) {
    if (grepl("Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec", s, ignore.case = TRUE) & !grepl("beaten|crossfire|shot|stat|other|torture|table", s, ignore.case = TRUE)) {
      print(paste0(f2, " ", s))
      tmp2 <- read_excel(tmp, sheet = s) %>%
        mutate(file_sheet = paste0(f,"_",s)) %>%
        relocate(file_sheet)
      names(tmp2) <- paste0("X",c(1:ncol(tmp2)))
      ejk <- bind_rows(ejk,tmp2)
    }
  }
}

# write to csv
write.csv(ejk, "data/ejk/ejk_raw.csv", row.names = FALSE, na = "")


