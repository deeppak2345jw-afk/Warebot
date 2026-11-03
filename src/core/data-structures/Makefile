CXX = g++
CXXFLAGS = -std=c++20 -Wall -Wextra -O2

TARGET = test_ds.exe
SRCS = test_data_structures.cpp

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(SRCS)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)
